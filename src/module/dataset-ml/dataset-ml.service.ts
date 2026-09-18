import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';

import { Parametro } from '../config-parametro/enums/parametro.enum';
import { OrigenLectura } from '../lectura-sensor/enums/origen-lectura.enum';

import {
  OrigenPuntoSerie,
  PuntoSerieResponseDto,
} from './dto/punto-serie-response.dto';

@Injectable()
export class DatasetMlService {
  constructor(
    @InjectRepository(SensorLectura)
    private readonly sensorLecturaRepo: Repository<SensorLectura>,

    @InjectRepository(MedicionManualLote)
    private readonly medicionManualRepo: Repository<MedicionManualLote>,
  ) {}

  /**
   * HU-50:
   * Arma la serie histórica de un parámetro para una empresa en un rango
   * de fechas, uniendo las dos fuentes posibles según el lote:
   *
   * - sensor_lecturas: lotes con sensor asociado. Incluye tanto lecturas
   *   reales (origen SENSOR) como el fallback manual mientras el sensor
   *   estaba en falla/inactivo (origen MANUAL, HU-15).
   * - mediciones_manuales_lote: lotes que nunca tuvieron sensor asociado
   *   (HU-20), fuente 100% manual.
   *
   * No se filtra ni se interpola ningún punto acá: la segmentación de
   * "qué es un gap real vs. continuidad normal" es responsabilidad del
   * microservicio ML, que decide en base a la continuidad temporal de
   * cada lote (y, si lo necesita, el umbralDesconexionMinutos del sensor
   * asociado, consultable aparte).
   */
  async obtenerSerie(
    empresaId: number,
    parametro: Parametro,
    desde: Date,
    hasta: Date,
  ): Promise<PuntoSerieResponseDto[]> {
    const deSensor = await this.sensorLecturaRepo
      .createQueryBuilder('sl')
      .innerJoin('sl.sensor', 'sensor')
      .where('sl.empresaId = :empresaId', { empresaId })
      .andWhere('sensor.parametro = :parametro', { parametro })
      .andWhere('sl.timestampLectura BETWEEN :desde AND :hasta', {
        desde,
        hasta,
      })
      .select('sl.loteId', 'loteId')
      .addSelect('sl.valor', 'valor')
      .addSelect('sl.timestampLectura', 'timestamp')
      .addSelect('sl.origen', 'origen')
      .getRawMany<{
        loteId: number;
        valor: string;
        timestamp: Date;
        origen: OrigenLectura;
      }>();

    const deManual = await this.medicionManualRepo
      .createQueryBuilder('m')
      .where('m.empresaId = :empresaId', { empresaId })
      .andWhere('m.parametro = :parametro', { parametro })
      .andWhere('m.createdAt BETWEEN :desde AND :hasta', { desde, hasta })
      .select('m.loteId', 'loteId')
      .addSelect('m.valor', 'valor')
      .addSelect('m.createdAt', 'timestamp')
      .getRawMany<{ loteId: number; valor: string; timestamp: Date }>();

    const puntosDeSensor: PuntoSerieResponseDto[] = deSensor.map((p) => ({
      loteId: p.loteId,
      valor: Number(p.valor),
      timestamp: p.timestamp,
      origen:
        p.origen === OrigenLectura.MANUAL
          ? OrigenPuntoSerie.MANUAL_FALLBACK
          : OrigenPuntoSerie.SENSOR,
    }));

    const puntosDeManual: PuntoSerieResponseDto[] = deManual.map((p) => ({
      loteId: p.loteId,
      valor: Number(p.valor),
      timestamp: p.timestamp,
      origen: OrigenPuntoSerie.MANUAL_SIN_SENSOR,
    }));

    return [...puntosDeSensor, ...puntosDeManual].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }
}