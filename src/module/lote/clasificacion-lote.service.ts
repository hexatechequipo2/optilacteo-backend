import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from '../lote/entities/lote.entity';
import { LoteClasificacionHistorial } from '../lote/entities/lote-clasificacion-historial.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { ClasificacionLote } from './enums/clasificacion-lote.enum';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from '../notificaciones/enums/tipo-notificacion.enum';

const VENTANA_DATO_DESACTUALIZADO_MS = 10 * 60 * 1000; // 10 minutos
const EPSILON_CONFLICTO = 0.001; // tolerancia para comparar decimales

interface ValorVigente {
  parametro: Parametro;
  valor: number;
  origen: 'sensor' | 'manual';
  timestamp: Date;
  sensorId?: number;
  enRevisionPorConflicto: boolean;
}

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
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async evaluarYClasificar(loteId: number, empresaId: number): Promise<void> {
    const lote = await this.loteRepository.findOne({
      where: { id: loteId, empresaId },
      relations: { parametros: true },
    });
    console.log('>>> evaluarYClasificar llamado', { loteId, empresaId });
    if (!lote) {
      this.logger.warn(
        `evaluarYClasificar: lote ${loteId} no encontrado (empresa ${empresaId})`,
      );
      return;
    }

    console.log('>>> lote encontrado', lote);
    const configs = await this.configParametroRepository.find({
      where: { empresaId, tipoMateriaPrima: lote.materiaPrima },
    });
    if (configs.length === 0) return;

    console.log('>>> configs', configs);
    const mapaConfig = new Map(configs.map((c) => [c.parametro, c]));
    const valoresVigentes = await this.obtenerValoresVigentes(
      loteId,
      empresaId,
      configs.map((c) => c.parametro),
      lote.parametros,
    );
    console.log('>>> valoresVigentes', Array.from(valoresVigentes.entries()));

    const faltantes = configs
      .map((c) => c.parametro)
      .filter((p) => !valoresVigentes.has(p));
    if (valoresVigentes.size === 0) {
      this.logger.warn(`No hay valores vigentes para lote ${loteId}`);
      return;
    }
    const ahora = new Date();
    let enRevision = false;
    let noApto = false;
    const parametrosUtilizados: LoteClasificacionHistorial['parametrosUtilizados'] =
      [];

    for (const [parametro, valor] of valoresVigentes) {
      parametrosUtilizados.push({
        parametro,
        valor: valor.valor,
      });

      if (valor.enRevisionPorConflicto) enRevision = true;
      if (
        ahora.getTime() - valor.timestamp.getTime() >
        VENTANA_DATO_DESACTUALIZADO_MS
      )
        enRevision = true;

      if (valor.origen === 'sensor' && valor.sensorId) {
        const sensor = await this.sensorRepository.findOne({
          where: { id: valor.sensorId },
        });
        if (sensor?.estado === EstadoSensor.INACTIVO) enRevision = true;
      }

      const config = mapaConfig.get(parametro);
      if (
        config &&
        (valor.valor < config.umbralMin || valor.valor > config.umbralMax)
      ) {
        noApto = true;
      }
    }

    const clasificacion = noApto
      ? ClasificacionLote.NO_APTO
      : ClasificacionLote.APTO;

    lote.clasificacion = clasificacion;
    await this.loteRepository.save(lote);

    console.log('>>> parámetros utilizados calculados', parametrosUtilizados);
    if (parametrosUtilizados.length > 0) {
      let ultimoHistorial = await this.historialRepository.findOne({
        where: { loteId, empresaId },
        order: { createdAt: 'DESC' },
      });

      if (
        ultimoHistorial &&
        ultimoHistorial.parametrosUtilizados.length === 0
      ) {
        console.log(
          '>>> actualizando historial vacío con parámetros',
          parametrosUtilizados,
        );
        ultimoHistorial.parametrosUtilizados = parametrosUtilizados;
        ultimoHistorial.clasificacion = clasificacion;
        await this.historialRepository.save(ultimoHistorial);
      } else {
        console.log(
          '>>> creando historial nuevo con parámetros',
          parametrosUtilizados,
        );
        const historial = this.historialRepository.create({
          loteId,
          empresaId,
          clasificacion,
          parametrosUtilizados,
        });
        await this.historialRepository.save(historial);
      }
    }

    if (clasificacion === ClasificacionLote.NO_APTO) {
      await this.notificacionesService.notificarResponsablesCalidad(
        empresaId,
        TipoNotificacion.LOTE_NO_APTO,
        `El lote ${lote.codigo} fue clasificado como no_apto.`,
        { loteId: lote.id, loteCodigo: lote.codigo, clasificacion },
      );
    }
  }

  historialDeLote(loteId: number, empresaId: number) {
    return this.historialRepository.find({
      where: { loteId, empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  private async obtenerValoresVigentes(
    loteId: number,
    empresaId: number,
    parametros: Parametro[],
    parametrosIniciales: { parametro: Parametro; valor: number }[],
  ): Promise<Map<Parametro, ValorVigente>> {
    const resultado = new Map<Parametro, ValorVigente>();

    for (const parametro of parametros) {
      console.log('>>> procesando parametro', parametro);
      console.log('>>> fallback a inicial', parametro);

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

      if (!ultimaLectura && !ultimaManual) {
        const paramInicial = parametrosIniciales.find(
          (p) => p.parametro === parametro,
        );
        if (paramInicial) {
          resultado.set(parametro, {
            parametro,
            valor: Number(paramInicial.valor),
            origen: 'manual',
            timestamp: new Date(),
            enRevisionPorConflicto: false,
          });
        }
        continue;
      }

      let conflicto = false;
      if (ultimaLectura && ultimaManual) {
        conflicto =
          Math.abs(Number(ultimaLectura.valor) - Number(ultimaManual.valor)) >
          EPSILON_CONFLICTO;
      }

      const usarSensor =
        !!ultimaLectura &&
        (!ultimaManual ||
          ultimaLectura.timestampLectura >= ultimaManual.createdAt);

      resultado.set(
        parametro,
        usarSensor
          ? {
              parametro,
              valor: Number(ultimaLectura!.valor),
              origen: 'sensor',
              timestamp: ultimaLectura!.timestampLectura,
              sensorId: ultimaLectura!.sensorId,
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
