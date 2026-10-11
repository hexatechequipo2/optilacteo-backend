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

import { Lote } from '../lote/entities/lote.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { SerieProveedorResponseDto } from './dto/serie-proveedor-response.dto';
import { MAX_LOTES_VENTANA } from '../estabilidad-proveedor/estabilidad-proveedor.service';

@Injectable()
export class DatasetMlService {
  constructor(
    @InjectRepository(SensorLectura)
    private readonly sensorLecturaRepo: Repository<SensorLectura>,

    @InjectRepository(MedicionManualLote)
    private readonly medicionManualRepo: Repository<MedicionManualLote>,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,

    @InjectRepository(ConfiguracionParametro)
    private readonly configRepo: Repository<ConfiguracionParametro>,
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

  /**
   * HU-64: valores de parámetros de cada lote agrupados por proveedor, con
   * los umbrales de config-parametro. Mismo criterio que
   * EstabilidadProveedorService.recalcular: solo lotes con parámetros y
   * los últimos MAX_LOTES_VENTANA por proveedor, para que lo que se
   * calibra sea exactamente lo que ve el indicador.
   */
  async obtenerLotesPorProveedor(
    empresaId: number,
  ): Promise<SerieProveedorResponseDto[]> {
    const lotes = await this.loteRepo.find({
      where: { empresaId },
      relations: { proveedor: true },
      order: { fechaIngreso: 'DESC', id: 'DESC' },
    });

    const configs = await this.configRepo.find({ where: { empresaId } });
    const mapaConfig = new Map(
      configs.map((c) => [`${c.parametro}|${c.tipoMateriaPrima}`, c]),
    );

    const porProveedor = new Map<number, SerieProveedorResponseDto>();

    for (const lote of lotes) {
      if (!lote.parametros?.length) continue; // sin parámetros: no aporta

      let entry = porProveedor.get(lote.proveedorId);
      if (!entry) {
        entry = {
          proveedorId: lote.proveedorId,
          proveedorNombre: lote.proveedor.razonSocial,
          cantidadLotes: 0,
          series: [],
        };
        porProveedor.set(lote.proveedorId, entry);
      }

      if (entry.cantidadLotes >= MAX_LOTES_VENTANA) continue; // ventana
      entry.cantidadLotes++;

      for (const p of lote.parametros) {
        let serie = entry.series.find(
          (s) =>
            s.parametro === p.parametro && s.materiaPrima === lote.materiaPrima,
        );
        if (!serie) {
          const cfg = mapaConfig.get(`${p.parametro}|${lote.materiaPrima}`);
          serie = {
            parametro: p.parametro,
            materiaPrima: lote.materiaPrima,
            valores: [],
            umbralMin: cfg ? Number(cfg.umbralMin) : null,
            umbralMax: cfg ? Number(cfg.umbralMax) : null,
          };
          entry.series.push(serie);
        }
        serie.valores.push(Number(p.valor));
      }
    }

    return [...porProveedor.values()];
  }
}