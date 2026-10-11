import { Injectable, NotFoundException } from '@nestjs/common';
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
import { BadRequestException } from '@nestjs/common';
import {
  EvolucionIndicadoresQueryDto,
  PeriodoEvolucion,
} from './dto/evolucion-indicadores-query.dto';
import {
  EvolucionIndicadoresResponseDto,
  SerieIndicadorDto,
  GranularidadAgregacion,
} from './dto/evolucion-indicadores-response.dto';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { SemaforoService } from '../config-parametro/semaforo.service';
import {
  SemaforoLoteResponseDto,
  SemaforoParametroDto,
} from './dto/semaforo-lote-response.dto';


const TIMEZONE_EMPRESA = 'America/Argentina/Cordoba';
type OrigenLecturaSemaforo = 'SENSOR' | 'MANUAL';

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
    private readonly semaforoService: SemaforoService,
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

  async getEvolucionIndicadores(
    tenant: TenantContext,
    query: EvolucionIndicadoresQueryDto,
  ): Promise<EvolucionIndicadoresResponseDto> {
    const empresaId = tenant.empresaId!;
    const { desde, hasta } = this.resolverRangoEvolucion(query);
    const granularidad = this.resolverGranularidadAgregacion(
      query.periodo,
      desde,
      hasta,
    );
    const unidadPostgres = this.mapearUnidadAgregacion(granularidad);
    const periodosEsperados = this.generarPeriodosEntreFechas(
      desde,
      hasta,
      granularidad,
    );

    const series: SerieIndicadorDto[] = [];
    for (const parametro of query.indicadores) {
      const filas = await this.obtenerLecturasCrudas(
        empresaId,
        parametro,
        desde,
        hasta,
        unidadPostgres,
      );
      const promedios = this.promediarPorPeriodo(filas);

      series.push({
        parametro,
        puntos: periodosEsperados.map((fecha) => ({
          fecha,
          valor: promedios.get(fecha) ?? null,
        })),
      });
    }

    return {
      granularidadAplicada: granularidad,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      series,
    };
  }

  // --- Helpers: evolución de indicadores (HU-39) ---

  private resolverRangoEvolucion(
    query: EvolucionIndicadoresQueryDto,
  ): { desde: Date; hasta: Date } {
    if (query.periodo === PeriodoEvolucion.RANGO) {
      if (!query.desde || !query.hasta) {
        throw new BadRequestException(
          'Debe indicar desde y hasta para un rango personalizado',
        );
      }
      const desde = new Date(query.desde);
      const hasta = new Date(query.hasta);
      hasta.setHours(23, 59, 59, 999);
      if (hasta < desde) {
        throw new BadRequestException(
          'La fecha de fin no puede ser anterior a la fecha de inicio',
        );
      }
      desde.setHours(0, 0, 0, 0);
      return { desde, hasta };
    }

    const hasta = new Date();
    hasta.setHours(23, 59, 59, 999);
    const desde = new Date();
    switch (query.periodo) {
      case PeriodoEvolucion.DIA:
        desde.setDate(desde.getDate() - 29);
        break;
      case PeriodoEvolucion.SEMANA:
        desde.setDate(desde.getDate() - 7 * 11);
        break;
      case PeriodoEvolucion.MES:
        desde.setMonth(desde.getMonth() - 11);
        break;
    }
    desde.setHours(0, 0, 0, 0);
    return { desde, hasta };
  }

  private resolverGranularidadAgregacion(
    periodo: PeriodoEvolucion,
    desde: Date,
    hasta: Date,
  ): GranularidadAgregacion {
    if (periodo !== PeriodoEvolucion.RANGO) {
      return periodo as unknown as GranularidadAgregacion;
    }
    const dias = (hasta.getTime() - desde.getTime()) / 86_400_000;
    if (dias <= 45) return GranularidadAgregacion.DIA;
    if (dias <= 180) return GranularidadAgregacion.SEMANA;
    return GranularidadAgregacion.MES;
  }

  private mapearUnidadAgregacion(g: GranularidadAgregacion): string {
    const mapa: Record<GranularidadAgregacion, string> = {
      [GranularidadAgregacion.DIA]: 'day',
      [GranularidadAgregacion.SEMANA]: 'week',
      [GranularidadAgregacion.MES]: 'month',
    };
    return mapa[g];
  }

  private generarPeriodosEntreFechas(
    desde: Date,
    hasta: Date,
    granularidad: GranularidadAgregacion,
  ): string[] {
    const periodos: string[] = [];
    let cursor = this.truncarComoPostgres(desde, granularidad);
    const haciaFinal = this.truncarComoPostgres(hasta, granularidad);

    while (cursor <= haciaFinal) {
      periodos.push(this.formatearPeriodoEvolucion(cursor, granularidad));
      cursor = this.avanzarPeriodo(cursor, granularidad);
    }
    return periodos;
  }

  // Replica exactamente lo que hace date_trunc en Postgres, para que las
  // claves generadas acá coincidan siempre con las que devuelve la query SQL.
  // Sin esto, "semana" desalinea (Postgres ancla al lunes) y "mes" puede
  // desbordar con setMonth() cuando el cursor cae en día 29/30/31.
  private truncarComoPostgres(
    fecha: Date,
    granularidad: GranularidadAgregacion,
  ): Date {
    const d = new Date(fecha);
    if (granularidad === GranularidadAgregacion.DIA) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (granularidad === GranularidadAgregacion.SEMANA) {
      const dia = d.getDay(); // 0=domingo...6=sábado
      const offset = (dia + 6) % 7; // días a retroceder hasta el lunes (ISO)
      d.setDate(d.getDate() - offset);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    // MES
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Como el cursor siempre tiene día=1 (gracias a truncarComoPostgres),
  // sumar un mes nunca desborda a otro mes distinto.
  private avanzarPeriodo(
    cursor: Date,
    granularidad: GranularidadAgregacion,
  ): Date {
    const d = new Date(cursor);
    switch (granularidad) {
      case GranularidadAgregacion.DIA:
        d.setDate(d.getDate() + 1);
        break;
      case GranularidadAgregacion.SEMANA:
        d.setDate(d.getDate() + 7);
        break;
      case GranularidadAgregacion.MES:
        d.setMonth(d.getMonth() + 1);
        break;
    }
    return d;
  }

  private formatearPeriodoEvolucion(
    fecha: Date,
    granularidad: GranularidadAgregacion,
  ): string {
    const d = new Date(fecha);
    if (granularidad === GranularidadAgregacion.MES) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return d.toISOString().slice(0, 10);
  }

  private async obtenerLecturasCrudas(
    empresaId: number,
    parametro: Parametro,
    desde: Date,
    hasta: Date,
    unidadPostgres: string,
  ): Promise<{ periodo: string; valor: number }[]> {
    const sensorRows = await this.sensorLecturaRepo
      .createQueryBuilder('lectura')
      .innerJoin('lectura.sensor', 'sensor')
      .select(
        `date_trunc('${unidadPostgres}', lectura."timestampLectura" AT TIME ZONE '${TIMEZONE_EMPRESA}')`,
        'periodo',
      )
      .addSelect('lectura.valor', 'valor')
      .where('lectura.empresaId = :empresaId', { empresaId })
      .andWhere('sensor.parametro = :parametro', { parametro })
      .andWhere('lectura.timestampLectura BETWEEN :desde AND :hasta', {
        desde,
        hasta,
      })
      .getRawMany<{ periodo: Date; valor: string }>();

    const manualRows = await this.medicionManualRepo
      .createQueryBuilder('m')
      .select(
        `date_trunc('${unidadPostgres}', m."createdAt" AT TIME ZONE '${TIMEZONE_EMPRESA}')`,
        'periodo',
      )
      .addSelect('m.valor', 'valor')
      .where('m.empresaId = :empresaId', { empresaId })
      .andWhere('m.parametro = :parametro', { parametro })
      .andWhere('m.createdAt BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawMany<{ periodo: Date; valor: string }>();

    return [...sensorRows, ...manualRows].map((r) => ({
      periodo: this.formatearPeriodoRaw(r.periodo, unidadPostgres),
      valor: Number(r.valor),
    }));
  }

  // date_trunc devuelve un Date; lo formateamos igual que
  // formatearPeriodoEvolucion para que las claves del Map coincidan.
  private formatearPeriodoRaw(fecha: Date, unidadPostgres: string): string {
    const d = new Date(fecha);
    if (unidadPostgres === 'month') {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return d.toISOString().slice(0, 10);
  }

  private promediarPorPeriodo(
    filas: { periodo: string; valor: number }[],
  ): Map<string, number> {
    const acumulado = new Map<string, { suma: number; cantidad: number }>();
    for (const { periodo, valor } of filas) {
      const actual = acumulado.get(periodo) ?? { suma: 0, cantidad: 0 };
      actual.suma += valor;
      actual.cantidad += 1;
      acumulado.set(periodo, actual);
    }
    const resultado = new Map<string, number>();
    for (const [periodo, { suma, cantidad }] of acumulado) {
      resultado.set(periodo, Number((suma / cantidad).toFixed(2)));
    }
    return resultado;
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

    // ============================================================
  // HU-40: SEMÁFORO EN TIEMPO REAL POR LOTE
  // ============================================================

  async getSemaforoLote(
    loteId: number,
    tenant: TenantContext,
  ): Promise<SemaforoLoteResponseDto> {
    const empresaId = tenant.empresaId!;

    const lote = await this.loteRepo.findOne({
      where: { id: loteId, empresaId },
    });

    if (!lote) {
      throw new NotFoundException(`Lote ${loteId} no encontrado`);
    }

    // DISTINCT ON (Postgres): última lectura por parámetro, en una sola
    // query en vez de N queries (una por parámetro).
    const [ultimasSensor, ultimasManual, configs] = await Promise.all([
      this.sensorLecturaRepo
        .createQueryBuilder('lectura')
        .innerJoin('lectura.sensor', 'sensor')
        .distinctOn(['sensor.parametro'])
        .select('sensor.parametro', 'parametro')
        .addSelect('lectura.valor', 'valor')
        .addSelect('lectura.timestampLectura', 'timestampLectura')
        .where('lectura.empresaId = :empresaId', { empresaId })
        .andWhere('lectura.loteId = :loteId', { loteId })
        .orderBy('sensor.parametro')
        .addOrderBy('lectura.timestampLectura', 'DESC')
        .getRawMany<{
          parametro: Parametro;
          valor: string;
          timestampLectura: Date;
        }>(),
      this.medicionManualRepo
        .createQueryBuilder('m')
        .distinctOn(['m.parametro'])
        .select('m.parametro', 'parametro')
        .addSelect('m.valor', 'valor')
        .addSelect('m.createdAt', 'createdAt')
        .where('m.empresaId = :empresaId', { empresaId })
        .andWhere('m.loteId = :loteId', { loteId })
        .orderBy('m.parametro')
        .addOrderBy('m.createdAt', 'DESC')
        .getRawMany<{ parametro: Parametro; valor: string; createdAt: Date }>(),
      this.configParametroRepo.find({
        where: { empresaId, tipoMateriaPrima: lote.materiaPrima },
      }),
    ]);

    // Última lectura EFECTIVA por parámetro: la más reciente entre
    // sensor_lecturas y medicion_manual_lote (mismo criterio que usan
    // lectura-sensor y medicion-manual para HU-40/HU-25).
    const mapaUltimaLectura = new Map<
      Parametro,
      { valor: number; timestamp: Date; origen: OrigenLecturaSemaforo }
    >();

    for (const fila of ultimasSensor) {
      mapaUltimaLectura.set(fila.parametro, {
        valor: Number(fila.valor),
        timestamp: new Date(fila.timestampLectura),
        origen: 'SENSOR',
      });
    }

    for (const fila of ultimasManual) {
      const actual = mapaUltimaLectura.get(fila.parametro);
      const timestampManual = new Date(fila.createdAt);

      if (!actual || timestampManual > actual.timestamp) {
        mapaUltimaLectura.set(fila.parametro, {
          valor: Number(fila.valor),
          timestamp: timestampManual,
          origen: 'MANUAL',
        });
      }
    }

    const mapaConfig = new Map(configs.map((c) => [c.parametro, c]));

    const parametros: SemaforoParametroDto[] = [];

    for (const [parametro, lectura] of mapaUltimaLectura) {
      const config = mapaConfig.get(parametro);

      parametros.push({
        parametro,
        valor: lectura.valor,
        estado: this.semaforoService.calcularEstado(lectura.valor, config),
        origen: lectura.origen,
        timestamp: lectura.timestamp,
      });
    }

    return {
      loteId: lote.id,
      loteCodigo: lote.codigo,
      parametros,
    };
  }
}