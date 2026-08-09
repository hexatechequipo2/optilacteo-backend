import { Injectable } from '@nestjs/common';
import { Between, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Lote } from '../lote/entities/lote.entity';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { ClasificacionLote } from '../lote/enums/clasificacion-lote.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import {
  DashboardResponseDto,
  MetricaDto,
  LineaCalidadDto,
  Tendencia,
} from './dto/dashboard-response.dto';
import {
  DashboardHistoricoDto,
  PuntoHistoricoDto,
  GranularidadHistorico,
} from './dto/dashboard-historico.dto';
import { EstadoLote } from '../lote/enums/estado-lote.enum';

const TIMEZONE_EMPRESA = 'America/Argentina/Cordoba';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepo: Repository<ConfiguracionParametro>,
    @InjectRepository(SensorLectura)
    private readonly sensorLecturaRepo: Repository<SensorLectura>,
    @InjectRepository(MedicionManualLote)
    private readonly medicionManualRepo: Repository<MedicionManualLote>,
  ) {}

  async getDashboard(
    tenant: TenantContext,
    granularidad: GranularidadHistorico = GranularidadHistorico.DIA,
  ): Promise<DashboardResponseDto> {
    const { actualDesde, actualHasta, anteriorDesde, anteriorHasta } =
      this.buildRangosPorGranularidad(granularidad);
    const empresaId = tenant.empresaId!;

    const [
      lotesActual,
      lotesAnterior,
      alertasActual,
      alertasAnterior,
      criticosActual,
      criticosAnterior,
      lineaCalidad,
    ] = await Promise.all([
      this.contarLotesProcesados(empresaId, actualDesde, actualHasta),
      this.contarLotesProcesados(empresaId, anteriorDesde, anteriorHasta),
      this.contarAlertasActivas(empresaId, actualDesde, actualHasta),
      this.contarAlertasActivas(empresaId, anteriorDesde, anteriorHasta),
      this.contarParametrosCriticos(empresaId, actualDesde, actualHasta),
      this.contarParametrosCriticos(empresaId, anteriorDesde, anteriorHasta),
      this.getLineaCalidad(empresaId, actualDesde, actualHasta),
    ]);

    return {
      granularidad,
      lotesProcesados: this.buildMetrica(lotesActual, lotesAnterior),
      alertasActivas: this.buildMetrica(alertasActual, alertasAnterior),
      parametrosCriticos: this.buildMetrica(criticosActual, criticosAnterior),
      lineaCalidad,
      actualizadoEn: new Date(),
    };
  }

  async getHistoricoLotesProcesados(
    tenant: TenantContext,
    granularidad: GranularidadHistorico,
    cantidad: number,
  ): Promise<DashboardHistoricoDto> {
    const empresaId = tenant.empresaId!;
    const { desde, hasta } = this.rangoPorGranularidad(granularidad, cantidad);
    const unidadPostgres = this.mapearUnidadPostgres(granularidad);

    // GROUP BY con date_trunc en lugar de un query por período: evita N queries
    // individuales cuando cantidad crece (ej. 24 meses = 24 queries antes, 1 ahora).
    const raw = await this.loteRepo
      .createQueryBuilder('lote')
      .select(
        `date_trunc('${unidadPostgres}', lote."fechaIngreso" AT TIME ZONE '${TIMEZONE_EMPRESA}')`,
        'periodo',
      )
      .addSelect('COUNT(*)', 'cantidad')
      .where('lote.empresaId = :empresaId', { empresaId })
      .andWhere('lote.fechaIngreso BETWEEN :desde AND :hasta', { desde, hasta })
      .andWhere('lote.estado IN (:...estados)', {
        estados: [EstadoLote.FINALIZADO, EstadoLote.RECHAZADO],
      })
      .groupBy('periodo')
      .orderBy('periodo', 'ASC')
      .getRawMany<{ periodo: Date; cantidad: string }>();

    const mapaResultados = new Map(
      raw.map((r) => [
        this.formatearPeriodo(r.periodo, granularidad),
        Number(r.cantidad),
      ]),
    );

    // Rellenamos los períodos sin lotes con 0 para no dejar huecos en el gráfico
    const puntos: PuntoHistoricoDto[] = this.generarPeriodos(
      granularidad,
      cantidad,
    ).map((fecha) => ({
      fecha,
      lotesProcesados: mapaResultados.get(fecha) ?? 0,
    }));

    return { granularidad, cantidad, puntos };
  }

  // --- Cálculo de cada métrica ---

  private async contarLotesProcesados(
    empresaId: number,
    desde: Date,
    hasta: Date,
  ) {
    return this.loteRepo.count({
      where: {
        empresaId,
        fechaIngreso: Between(desde, hasta),
        estado: In([EstadoLote.FINALIZADO, EstadoLote.RECHAZADO]),
      },
    });
  }

  private async contarAlertasActivas(
    empresaId: number,
    desde: Date,
    hasta: Date,
  ) {
    return this.notificacionRepo.count({
      where: { empresaId, leida: false, createdAt: Between(desde, hasta) },
    });
  }

  private async contarParametrosCriticos(
    empresaId: number,
    desde: Date,
    hasta: Date,
  ) {
    const configs = await this.configParametroRepo.find({
      where: { empresaId },
    });
    if (configs.length === 0) return 0;

    const idsCriticos = new Set<number>();

    const lecturas = await this.sensorLecturaRepo
      .createQueryBuilder('lectura')
      .innerJoin('lectura.sensor', 'sensor')
      .innerJoin('lectura.lote', 'lote')
      .select([
        'lectura.valor AS valor',
        'sensor.parametro AS parametro',
        'lote.materiaPrima AS materiaPrima',
      ])
      .where('lectura.empresaId = :empresaId', { empresaId })
      .andWhere('lectura.timestampLectura BETWEEN :desde AND :hasta', {
        desde,
        hasta,
      })
      .getRawMany<{ valor: string; parametro: string; materiaprima: string }>();

    const manuales = await this.medicionManualRepo
      .createQueryBuilder('m')
      .select([
        'm.valor AS valor',
        'm.parametro AS parametro',
        'm.tipoMateriaPrima AS tipomateriaprima',
      ])
      .where('m.empresaId = :empresaId', { empresaId })
      .andWhere('m.createdAt BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawMany<{
        valor: string;
        parametro: string;
        tipomateriaprima: string;
      }>();

    const evaluar = (
      valor: number,
      parametro: string,
      materiaPrima: string,
    ) => {
      const config = configs.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        (c) => c.parametro === parametro && c.tipoMateriaPrima === materiaPrima,
      );
      if (!config) return;
      if (
        valor < Number(config.umbralMin) ||
        valor > Number(config.umbralMax)
      ) {
        idsCriticos.add(config.id);
      }
    };

    for (const l of lecturas)
      evaluar(Number(l.valor), l.parametro, l.materiaprima);
    for (const m of manuales)
      evaluar(Number(m.valor), m.parametro, m.tipomateriaprima);

    return idsCriticos.size;
  }

  private async getLineaCalidad(
    empresaId: number,
    desde: Date,
    hasta: Date,
  ): Promise<LineaCalidadDto> {
    const [recepcion, clasificacion, aptos, noAptos, totalLotesSistema] =
      await Promise.all([
        this.loteRepo.count({
          where: { empresaId, fechaIngreso: Between(desde, hasta) },
        }),
        this.loteRepo
          .createQueryBuilder('lote')
          .where('lote.empresaId = :empresaId', { empresaId })
          .andWhere('lote.fechaIngreso BETWEEN :desde AND :hasta', {
            desde,
            hasta,
          })
          .andWhere('lote.clasificacion IS NOT NULL')
          .getCount(),
        this.loteRepo.count({
          where: {
            empresaId,
            clasificacion: ClasificacionLote.APTO,
            fechaIngreso: Between(desde, hasta),
          },
        }),
        this.loteRepo.count({
          where: {
            empresaId,
            clasificacion: ClasificacionLote.NO_APTO,
            fechaIngreso: Between(desde, hasta),
          },
        }),
        this.loteRepo.count({ where: { empresaId } }),
      ]);

    return { recepcion, clasificacion, aptos, noAptos, totalLotesSistema };
  }

  // --- Helpers de métricas (dashboard principal) ---

  private buildMetrica(valor: number, valorAnterior: number): MetricaDto {
    const variacion = valor - valorAnterior;
    const tendencia: Tendencia =
      variacion > 0 ? 'sube' : variacion < 0 ? 'baja' : 'igual';
    return { valor, valorAnterior, tendencia, variacion };
  }

  private buildRangosPorGranularidad(granularidad: GranularidadHistorico) {
    const actual = this.rangoPeriodoActual(granularidad);
    const anterior = this.rangoPeriodoAnterior(granularidad);
    return {
      actualDesde: actual.desde,
      actualHasta: actual.hasta,
      anteriorDesde: anterior.desde,
      anteriorHasta: anterior.hasta,
    };
  }

  private rangoPeriodoActual(granularidad: GranularidadHistorico): {
    desde: Date;
    hasta: Date;
  } {
    const hasta = new Date();
    hasta.setHours(23, 59, 59, 999);
    const desde = new Date();

    switch (granularidad) {
      case GranularidadHistorico.DIA:
        // hoy: sin cambios
        break;
      case GranularidadHistorico.SEMANA:
        // lunes de esta semana (ISO: lunes=1 ... domingo=0)
        desde.setDate(desde.getDate() - ((desde.getDay() + 6) % 7));
        break;
      case GranularidadHistorico.MES:
        desde.setDate(1);
        break;
    }
    desde.setHours(0, 0, 0, 0);
    return { desde, hasta };
  }

  private rangoPeriodoAnterior(granularidad: GranularidadHistorico): {
    desde: Date;
    hasta: Date;
  } {
    const { desde: desdeActual } = this.rangoPeriodoActual(granularidad);
    const hasta = new Date(desdeActual);
    hasta.setMilliseconds(-1); // último instante del período anterior

    const desde = new Date(desdeActual);
    switch (granularidad) {
      case GranularidadHistorico.DIA:
        desde.setDate(desde.getDate() - 1);
        break;
      case GranularidadHistorico.SEMANA:
        desde.setDate(desde.getDate() - 7);
        break;
      case GranularidadHistorico.MES:
        desde.setMonth(desde.getMonth() - 1);
        break;
    }
    desde.setHours(0, 0, 0, 0);
    return { desde, hasta };
  }

  // --- Helpers de granularidad (histórico) ---

  private rangoPorGranularidad(
    granularidad: GranularidadHistorico,
    cantidad: number,
  ): { desde: Date; hasta: Date } {
    const hasta = new Date();
    hasta.setHours(23, 59, 59, 999);

    const desde = new Date();
    switch (granularidad) {
      case GranularidadHistorico.DIA:
        desde.setDate(desde.getDate() - (cantidad - 1));
        break;
      case GranularidadHistorico.SEMANA:
        desde.setDate(desde.getDate() - (cantidad - 1) * 7);
        break;
      case GranularidadHistorico.MES:
        desde.setMonth(desde.getMonth() - (cantidad - 1));
        break;
    }
    desde.setHours(0, 0, 0, 0);
    return { desde, hasta };
  }

  private generarPeriodos(
    granularidad: GranularidadHistorico,
    cantidad: number,
  ): string[] {
    const periodos: string[] = [];
    for (let i = cantidad - 1; i >= 0; i--) {
      const fecha = new Date();
      if (granularidad === GranularidadHistorico.DIA)
        fecha.setDate(fecha.getDate() - i);
      if (granularidad === GranularidadHistorico.SEMANA)
        fecha.setDate(fecha.getDate() - i * 7);
      if (granularidad === GranularidadHistorico.MES)
        fecha.setMonth(fecha.getMonth() - i);
      periodos.push(this.formatearPeriodo(fecha, granularidad));
    }
    return periodos;
  }

  private formatearPeriodo(
    fecha: Date,
    granularidad: GranularidadHistorico,
  ): string {
    const d = new Date(fecha);
    if (granularidad === GranularidadHistorico.MES) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return d.toISOString().slice(0, 10);
  }

  // Postgres date_trunc solo acepta unidades en inglés (day/week/month).
  // El enum de la API se mantiene en español por consistencia con el resto
  // del proyecto; este mapeo aísla esa traducción en un único lugar.
  private mapearUnidadPostgres(granularidad: GranularidadHistorico): string {
    const mapa: Record<GranularidadHistorico, string> = {
      [GranularidadHistorico.DIA]: 'day',
      [GranularidadHistorico.SEMANA]: 'week',
      [GranularidadHistorico.MES]: 'month',
    };
    return mapa[granularidad];
  }
}
