import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IPrediccionClient } from './interfaces/prediccion-client.interface';
import { PREDICCION_CLIENT } from './interfaces/prediccion-client.interface';

import type { IPrediccionVolumenRepository } from './repository/prediccion-volumen.repository.interface';
import { PREDICCION_VOLUMEN_REPOSITORY } from './repository/prediccion-volumen.repository.interface';

import { TipoMateriaPrima } from '../config-parametro/enums/tipo-materia-prima-enum';
import { UnidadCantidad } from '../lote/enums/unidad-cantidad.enum';
import { StatusPrediccion } from './enums/status-prediccion.enum';
import { PrediccionVolumenQueryDto } from './dto/prediccion-volumen-query.dto';
import { PrediccionVolumenResponseDto } from './dto/prediccion-volumen-response.dto';

const DIAS_MINIMOS_HISTORICO = 21;
const DIAS_HISTORICO_PARA_ENTRENAR = 180; // ventana que se le manda al ML para entrenar/predecir

const UNIDAD_POR_MATERIA_PRIMA: Record<TipoMateriaPrima, UnidadCantidad> = {
  [TipoMateriaPrima.LECHE_CRUDA]: UnidadCantidad.LITROS,
  [TipoMateriaPrima.CREMA_DE_LECHE]: UnidadCantidad.LITROS,
  [TipoMateriaPrima.MASA_HILADA]: UnidadCantidad.KILOGRAMOS,
};

@Injectable()
export class PrediccionVolumenService {
  private readonly logger = new Logger(PrediccionVolumenService.name);

  constructor(
    @Inject(PREDICCION_CLIENT)
    private readonly prediccionClient: IPrediccionClient,

    @Inject(PREDICCION_VOLUMEN_REPOSITORY)
    private readonly prediccionRepository: IPrediccionVolumenRepository,
  ) {}

  /**
   * Llamado por el cron diario (PrediccionVolumenTask). Genera y persiste
   * la predicción para una empresa+materia prima. Best-effort a nivel
   * cron: un fallo acá no debe tumbar el resto del batch.
   */
  async generarYPersistir(
    empresaId: number,
    tipoMateriaPrima: TipoMateriaPrima,
  ): Promise<void> {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - DIAS_HISTORICO_PARA_ENTRENAR);

    const serieHistorica = await this.prediccionRepository.obtenerSerieHistorica(
      empresaId,
      tipoMateriaPrima,
      desde,
      hasta,
    );

    if (serieHistorica.length < DIAS_MINIMOS_HISTORICO) {
      await this.prediccionRepository.create({
        empresaId,
        tipoMateriaPrima,
        unidad: UNIDAD_POR_MATERIA_PRIMA[tipoMateriaPrima],
        modeloVersion: 'n/a',
        dias: [],
        status: StatusPrediccion.INSUFFICIENT_DATA,
      });

      this.logger.log(
        `Histórico insuficiente para empresa ${empresaId}, materia prima ` +
          `${tipoMateriaPrima}: ${serieHistorica.length}/${DIAS_MINIMOS_HISTORICO} días.`,
      );
      return;
    }

    let resultado;
    try {
      resultado = await this.prediccionClient.predecir({
        empresaId,
        tipoMateriaPrima,
        serieHistorica,
      });
    } catch (err) {
      this.logger.error(
        `Error al consultar el microservicio ML de volumen (empresa ` +
          `${empresaId}, materia prima ${tipoMateriaPrima}): ${err}`,
      );
      return;
    }

    if (resultado.status !== 'ok' || !resultado.dias) {
      await this.prediccionRepository.create({
        empresaId,
        tipoMateriaPrima,
        unidad: UNIDAD_POR_MATERIA_PRIMA[tipoMateriaPrima],
        modeloVersion: resultado.modeloVersion ?? 'n/a',
        dias: [],
        status: StatusPrediccion.INSUFFICIENT_DATA,
      });
      return;
    }

    await this.prediccionRepository.create({
      empresaId,
      tipoMateriaPrima,
      unidad: UNIDAD_POR_MATERIA_PRIMA[tipoMateriaPrima],
      modeloVersion: resultado.modeloVersion ?? 'desconocida',
      dias: resultado.dias,
      status: StatusPrediccion.OK,
    });
  }

  /**
   * Sirve al dashboard: lee la última predicción persistida (nunca llama
   * al microservicio ML en el camino del GET) + arma el histórico reciente
   * según el rango que pidió el usuario (criterio 4).
   */
  async obtenerParaDashboard(
    empresaId: number,
    query: PrediccionVolumenQueryDto,
  ): Promise<PrediccionVolumenResponseDto> {
    const ultima = await this.prediccionRepository.findUltimaVigente(
      empresaId,
      query.tipoMateriaPrima,
    );

    const diasHistorico = query.diasHistorico ?? 14;
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - diasHistorico);

    const serieHistorica = await this.prediccionRepository.obtenerSerieHistorica(
      empresaId,
      query.tipoMateriaPrima,
      desde,
      hasta,
    );

    const historicoReciente = serieHistorica.map((s) => ({
      fecha: s.fecha,
      valor: s.valor,
    }));

    if (!ultima) {
      return {
        status: StatusPrediccion.INSUFFICIENT_DATA,
        tipoMateriaPrima: query.tipoMateriaPrima,
        unidad: null,
        fechaActualizacionModelo: null,
        modeloVersion: null,
        prediccion: [],
        historicoReciente,
        mensaje:
          'Todavía no se generó ninguna predicción para esta materia prima. ' +
          'La primera se generará en la próxima corrida automática del modelo.',
      };
    }

    if (ultima.status === StatusPrediccion.INSUFFICIENT_DATA) {
      return {
        status: StatusPrediccion.INSUFFICIENT_DATA,
        tipoMateriaPrima: query.tipoMateriaPrima,
        unidad: ultima.unidad,
        fechaActualizacionModelo: ultima.fechaGeneracion,
        modeloVersion: null,
        prediccion: [],
        historicoReciente,
        mensaje:
          `Todavía no hay suficiente histórico para generar una predicción ` +
          `confiable (mínimo ${DIAS_MINIMOS_HISTORICO} días de datos).`,
      };
    }

    return {
      status: StatusPrediccion.OK,
      tipoMateriaPrima: query.tipoMateriaPrima,
      unidad: ultima.unidad,
      fechaActualizacionModelo: ultima.fechaGeneracion,
      modeloVersion: ultima.modeloVersion,
      prediccion: ultima.dias,
      historicoReciente,
    };
  }

  /**
   * HU-51 criterio 7: exportar predicción + histórico comparado a CSV.
   */
  async exportarCsv(
    empresaId: number,
    query: PrediccionVolumenQueryDto,
  ): Promise<Buffer> {
    const data = await this.obtenerParaDashboard(empresaId, query);

    const escaparCsv = (valor: unknown): string => {
      if (valor === null || valor === undefined) return '';
      return `"${String(valor).replace(/"/g, '""')}"`;
    };

    const filas: string[] = [];
    filas.push(
      ['Tipo', 'Fecha', 'Valor', 'Mínimo', 'Esperado', 'Máximo']
        .map(escaparCsv)
        .join(';'),
    );

    for (const h of data.historicoReciente) {
      filas.push(
        ['Histórico', h.fecha, h.valor, '', '', ''].map(escaparCsv).join(';'),
      );
    }

    for (const p of data.prediccion) {
      filas.push(
        ['Predicción', p.fecha, '', p.minimo, p.esperado, p.maximo]
          .map(escaparCsv)
          .join(';'),
      );
    }

    const contenido = '\uFEFF' + filas.join('\r\n');
    return Buffer.from(contenido, 'utf8');
  }
}