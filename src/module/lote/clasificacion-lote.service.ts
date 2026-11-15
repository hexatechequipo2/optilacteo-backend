import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';
import { LoteClasificacionHistorial } from './entities/lote-clasificacion-historial.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { SemaforoService } from '../config-parametro/semaforo.service';
import { EstadoMedicion } from '../lectura-sensor/enums/estado-medicion.enum';
import { ClasificacionLote } from './enums/clasificacion-lote.enum';
import { EstadoLote } from './enums/estado-lote.enum';
import {
  NivelParametro,
  OrigenValor,
  ParametroEvaluado,
  ParametroHistorico,
} from './types/parametro-evaluado.type';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from '../notificaciones/enums/tipo-notificacion.enum';

/**
 * HU-76 (criterios 3, 5 y 8): si es true, un parámetro en banda de alerta
 * clasifica el lote como NO_APTO. Pendiente de validar con producto.
 * Un parámetro crítico siempre clasifica NO_APTO.
 */
export const ALERTA_CLASIFICA_NO_APTO = true;

/**
 * Si es true, un lote sin problemas detectados queda sin clasificar mientras
 * falte algún parámetro configurado. Un problema ya detectado clasifica
 * NO_APTO aunque falten parámetros: más datos no lo revierten.
 */
export const EXIGIR_PARAMETROS_COMPLETOS = true;

const EPSILON_CONFLICTO = 0.001; // tolerancia para comparar decimales

const ORDEN_NIVEL: Record<NivelParametro, number> = {
  critico: 0,
  alerta: 1,
  normal: 2,
};

interface ValorVigente {
  parametro: Parametro;
  valor: number;
  origen: OrigenValor;
  timestamp: Date;
  sensorId?: number;
  enRevisionPorConflicto: boolean;
}

export type ResultadoClasificacion =
  | {
      resultado:
        | 'lote_no_encontrado'
        | 'omitido_lote_rechazado'
        | 'sin_configuracion'
        | 'sin_valores';
    }
  | { resultado: 'parametros_incompletos'; faltantes: Parametro[] }
  | {
      resultado: 'sin_cambios' | 'clasificado';
      clasificacion: ClasificacionLote;
    };

@Injectable()
export class ClasificacionLoteService {
  private readonly logger = new Logger(ClasificacionLoteService.name);

  constructor(
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(LoteClasificacionHistorial)
    private readonly historialRepository: Repository<LoteClasificacionHistorial>,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepository: Repository<ConfiguracionParametro>,
    @InjectRepository(SensorLectura)
    private readonly sensorLecturaRepository: Repository<SensorLectura>,
    @InjectRepository(MedicionManualLote)
    private readonly medicionManualRepository: Repository<MedicionManualLote>,
    private readonly semaforoService: SemaforoService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async evaluarYClasificar(
    loteId: number,
    empresaId: number,
  ): Promise<ResultadoClasificacion> {
    const lote = await this.loteRepository.findOne({
      where: { id: loteId, empresaId },
      relations: { parametros: true },
    });
    if (!lote) {
      this.logger.warn(
        `evaluarYClasificar: lote ${loteId} no encontrado (empresa ${empresaId})`,
      );
      return { resultado: 'lote_no_encontrado' };
    }

    // Un lote rechazado tiene una decisión humana final (HU-22).
    if (lote.estado === EstadoLote.RECHAZADO) {
      return { resultado: 'omitido_lote_rechazado' };
    }

    const configs = await this.configParametroRepository.find({
      where: { empresaId, tipoMateriaPrima: lote.materiaPrima },
    });
    if (configs.length === 0) {
      this.logger.warn(
        `Lote ${lote.codigo} (${loteId}) sin clasificar: la empresa ${empresaId} ` +
          `no tiene configuración de umbrales para '${lote.materiaPrima}'.`,
      );
      return { resultado: 'sin_configuracion' };
    }

    const mapaConfig = new Map(configs.map((c) => [c.parametro, c]));
    const valoresVigentes = await this.obtenerValoresVigentes(
      loteId,
      empresaId,
      configs.map((c) => c.parametro),
      lote.parametros ?? [],
    );
    if (valoresVigentes.size === 0) {
      this.logger.warn(`No hay valores vigentes para lote ${loteId}`);
      return { resultado: 'sin_valores' };
    }

    const evaluados: ParametroEvaluado[] = [];
    for (const [parametro, vigente] of valoresVigentes) {
      const config = mapaConfig.get(parametro);
      if (!config) continue;
      evaluados.push(this.evaluarParametro(vigente, config));
    }

    const hayCritico = evaluados.some((e) => e.nivel === 'critico');
    const hayAlerta = evaluados.some((e) => e.nivel === 'alerta');
    const hayRechazo = hayCritico || (ALERTA_CLASIFICA_NO_APTO && hayAlerta);

    const faltantes = configs
      .map((c) => c.parametro)
      .filter((p) => !valoresVigentes.has(p));

    if (EXIGIR_PARAMETROS_COMPLETOS && faltantes.length > 0 && !hayRechazo) {
      this.logger.log(
        `Lote ${lote.codigo} (${loteId}) pendiente de clasificar: faltan ` +
          `parámetros [${faltantes.join(', ')}].`,
      );
      return { resultado: 'parametros_incompletos', faltantes };
    }

    const clasificacion = hayRechazo
      ? ClasificacionLote.NO_APTO
      : ClasificacionLote.APTO;

    // Criterio 7: parámetros que explican el resultado, críticos primero.
    const motivos = evaluados
      .filter((e) => e.nivel !== 'normal')
      .sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel]);

    // Se compara contra la ÚLTIMA EVALUACIÓN AUTOMÁTICA (no contra
    // lote.clasificacion) para no pisar una aprobación manual mientras las
    // condiciones no hayan cambiado.
    const ultimoHistorial = await this.historialRepository.findOne({
      where: { loteId, empresaId },
      order: { createdAt: 'DESC' },
    });

    const sinCambios =
      !!ultimoHistorial &&
      ultimoHistorial.parametrosUtilizados.length > 0 &&
      this.firmar(
        ultimoHistorial.clasificacion,
        ultimoHistorial.parametrosUtilizados,
      ) === this.firmar(clasificacion, evaluados);

    if (sinCambios) {
      // Misma situación: sin historial, sin notificación y sin tocar la
      // clasificación vigente. Solo se refrescan los motivos (valores actuales).
      let modificado = false;
      if (
        JSON.stringify(lote.clasificacionMotivos ?? null) !==
        JSON.stringify(motivos)
      ) {
        lote.clasificacionMotivos = motivos;
        modificado = true;
      }
      if (lote.clasificacion == null) {
        lote.clasificacion = clasificacion;
        modificado = true;
      }
      if (modificado) await this.loteRepository.save(lote);
      return { resultado: 'sin_cambios', clasificacion };
    }

    // Cambio real: reclasifica, registra historial y notifica.
    lote.clasificacion = clasificacion;
    lote.clasificacionMotivos = motivos;
    lote.clasificacionManual = false;
    await this.loteRepository.save(lote);

    if (ultimoHistorial && ultimoHistorial.parametrosUtilizados.length === 0) {
      ultimoHistorial.parametrosUtilizados = evaluados;
      ultimoHistorial.clasificacion = clasificacion;
      await this.historialRepository.save(ultimoHistorial);
    } else {
      await this.historialRepository.save(
        this.historialRepository.create({
          loteId,
          empresaId,
          clasificacion,
          parametrosUtilizados: evaluados,
        }),
      );
    }

    for (const e of evaluados.filter((x) => x.enRevisionPorConflicto)) {
      this.logger.warn(
        `Lote ${lote.codigo}: conflicto entre sensor y medición manual en ` +
          `'${e.parametro}'; se usó el valor más reciente (${e.valor}, ${e.origen}).`,
      );
    }

    if (clasificacion === ClasificacionLote.NO_APTO) {
      const detalle = motivos
        .map((m) => `${m.parametro}=${m.valor} (${m.nivel})`)
        .join(', ');
      await this.notificacionesService.notificarResponsablesCalidad(
        empresaId,
        TipoNotificacion.LOTE_NO_APTO,
        `El lote ${lote.codigo} fue clasificado como no_apto. Parámetros: ${detalle}.`,
        { loteId: lote.id, loteCodigo: lote.codigo, clasificacion, motivos },
      );
    }

    return { resultado: 'clasificado', clasificacion };
  }

  historialDeLote(loteId: number, empresaId: number) {
    return this.historialRepository.find({
      where: { loteId, empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  // Criterio 8: SemaforoService es la única fuente de verdad de los límites.
  private evaluarParametro(
    vigente: ValorVigente,
    config: ConfiguracionParametro,
  ): ParametroEvaluado {
    const estado = this.semaforoService.calcularEstado(vigente.valor, config);
    const nivel: NivelParametro =
      estado === EstadoMedicion.FUERA_DE_RANGO
        ? 'critico'
        : estado === EstadoMedicion.EN_LIMITE
          ? 'alerta'
          : 'normal';

    return {
      parametro: vigente.parametro,
      valor: vigente.valor,
      nivel,
      origen: vigente.origen,
      enRevisionPorConflicto: vigente.enRevisionPorConflicto,
      umbralMin: Number(config.umbralMin),
      umbralMax: Number(config.umbralMax),
      umbralAlertaMin: Number(config.umbralAlertaMin),
      umbralAlertaMax: Number(config.umbralAlertaMax),
    };
  }

  // Firma: clasificación + nivel de cada parámetro fuera de lo normal. No
  // incluye los valores: una lectura que pasa de 9.5 a 9.6 siendo igualmente
  // crítica no genera historial. Las filas anteriores a HU-76 no tienen
  // 'nivel', así que su firma difiere una única vez.
  private firmar(
    clasificacion: ClasificacionLote,
    parametros: ReadonlyArray<ParametroHistorico>,
  ): string {
    const items = parametros
      .filter((p) => p.nivel && p.nivel !== 'normal')
      .map((p) => `${p.parametro}:${p.nivel}`)
      .sort();
    return `${clasificacion}|${items.join(',')}`;
  }

  private async obtenerValoresVigentes(
    loteId: number,
    empresaId: number,
    parametros: Parametro[],
    parametrosIniciales: { parametro: Parametro; valor: number }[],
  ): Promise<Map<Parametro, ValorVigente>> {
    const resultado = new Map<Parametro, ValorVigente>();

    for (const parametro of parametros) {
      const ultimaLectura = await this.sensorLecturaRepository
        .createQueryBuilder('lectura')
        .innerJoin('lectura.sensor', 'sensor')
        .addSelect(['sensor.id', 'sensor.parametro'])
        .where('lectura.loteId = :loteId', { loteId })
        .andWhere('lectura.empresaId = :empresaId', { empresaId })
        .andWhere('sensor.parametro = :parametro', { parametro })
        .orderBy('lectura.timestampLectura', 'DESC')
        .getOne();

      const ultimaManual = await this.medicionManualRepository.findOne({
        where: { loteId, empresaId, parametro },
        order: { createdAt: 'DESC' },
      });

      // Sin lecturas ni mediciones: se usa el valor cargado al registrar el lote.
      if (!ultimaLectura && !ultimaManual) {
        const paramInicial = parametrosIniciales.find(
          (p) => p.parametro === parametro,
        );
        if (paramInicial) {
          resultado.set(parametro, {
            parametro,
            valor: Number(paramInicial.valor),
            origen: 'inicial',
            timestamp: new Date(),
            enRevisionPorConflicto: false,
          });
        }
        continue;
      }

      const conflicto =
        !!ultimaLectura &&
        !!ultimaManual &&
        Math.abs(Number(ultimaLectura.valor) - Number(ultimaManual.valor)) >
          EPSILON_CONFLICTO;

      const usarSensor =
        !!ultimaLectura &&
        (!ultimaManual ||
          ultimaLectura.timestampLectura >= ultimaManual.createdAt);

      resultado.set(
        parametro,
        usarSensor
          ? {
              parametro,
              valor: Number(ultimaLectura.valor),
              origen: 'sensor',
              timestamp: ultimaLectura.timestampLectura,
              sensorId: ultimaLectura.sensorId,
              enRevisionPorConflicto: conflicto,
            }
          : {
              parametro,
              valor: Number(ultimaManual!.valor),
              origen: 'manual',
              timestamp: ultimaManual!.createdAt,
              enRevisionPorConflicto: conflicto,
            },
      );
    }

    return resultado;
  }
}