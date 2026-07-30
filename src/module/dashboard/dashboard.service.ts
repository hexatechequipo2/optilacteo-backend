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
import { DashboardHistoricoDto, PuntoHistoricoDto } from './dto/dashboard-historico.dto';
import { EstadoLote } from '../lote/enums/estado-lote.enum';

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

  async getDashboard(tenant: TenantContext): Promise<DashboardResponseDto> {
    const { hoyDesde, hoyHasta, ayerDesde, ayerHasta } = this.buildRangos();
    const empresaId = tenant.empresaId!;

    const [
      lotesHoy,
      lotesAyer,
      alertasHoy,
      alertasAyer,
      criticosHoy,
      criticosAyer,
      lineaCalidad,
    ] = await Promise.all([
      this.contarLotesProcesados(empresaId, hoyDesde, hoyHasta),
      this.contarLotesProcesados(empresaId, ayerDesde, ayerHasta),
      this.contarAlertasActivas(empresaId, hoyDesde, hoyHasta),
      this.contarAlertasActivas(empresaId, ayerDesde, ayerHasta),
      this.contarParametrosCriticos(empresaId, hoyDesde, hoyHasta),
      this.contarParametrosCriticos(empresaId, ayerDesde, ayerHasta),
      this.getLineaCalidad(empresaId, hoyDesde, hoyHasta),
    ]);

    return {
      lotesProcesados: this.buildMetrica(lotesHoy, lotesAyer),
      alertasActivas: this.buildMetrica(alertasHoy, alertasAyer),
      parametrosCriticos: this.buildMetrica(criticosHoy, criticosAyer),
      lineaCalidad,
      actualizadoEn: new Date(),
    };
  }

  async getHistoricoLotesProcesados(
    tenant: TenantContext,
    dias: number,
  ): Promise<DashboardHistoricoDto> {
    const empresaId = tenant.empresaId!;
    const puntos: PuntoHistoricoDto[] = [];

    // Un query por día es suficiente para 7-31 días; si el rango crece
    // conviene reemplazar por un GROUP BY DATE(fechaIngreso) en una sola query.
    for (let i = dias - 1; i >= 0; i--) {
      const { desde, hasta } = this.rangoDelDia(i);
      const valor = await this.contarLotesProcesados(empresaId, desde, hasta);
      puntos.push({ fecha: desde.toISOString().slice(0, 10), lotesProcesados: valor });
    }

    return { dias, puntos };
  }

  // --- Cálculo de cada métrica ---

  private async contarLotesProcesados(empresaId: number, desde: Date, hasta: Date) {
    return this.loteRepo.count({
        where: {
        empresaId,
        fechaIngreso: Between(desde, hasta),
        estado: In([EstadoLote.FINALIZADO, EstadoLote.RECHAZADO]),
        },
    });
  }

  private async contarAlertasActivas(empresaId: number, desde: Date, hasta: Date) {
    return this.notificacionRepo.count({
      where: { empresaId, leida: false, createdAt: Between(desde, hasta) },
    });
  }

  private async contarParametrosCriticos(empresaId: number, desde: Date, hasta: Date) {
    const configs = await this.configParametroRepo.find({ where: { empresaId } });
    if (configs.length === 0) return 0;

    const idsCriticos = new Set<number>();

    // Lecturas de sensor del día, con el tipo de materia prima del lote asociado
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
      .andWhere('lectura.timestampLectura BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawMany<{ valor: string; parametro: string; materiaprima: string }>();

    // Mediciones manuales del día (ya traen parametro + tipoMateriaPrima directo)
    const manuales = await this.medicionManualRepo
      .createQueryBuilder('m')
      .select(['m.valor AS valor', 'm.parametro AS parametro', 'm.tipoMateriaPrima AS tipomateriaprima'])
      .where('m.empresaId = :empresaId', { empresaId })
      .andWhere('m.createdAt BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawMany<{ valor: string; parametro: string; tipomateriaprima: string }>();

    const evaluar = (valor: number, parametro: string, materiaPrima: string) => {
      const config = configs.find(
        (c) => c.parametro === parametro && c.tipoMateriaPrima === materiaPrima,
      );
      if (!config) return;
      if (valor < Number(config.umbralMin) || valor > Number(config.umbralMax)) {
        idsCriticos.add(config.id);
      }
    };

    for (const l of lecturas) evaluar(Number(l.valor), l.parametro, l.materiaprima);
    for (const m of manuales) evaluar(Number(m.valor), m.parametro, m.tipomateriaprima);

    return idsCriticos.size;
  }

  private async getLineaCalidad(
    empresaId: number,
    desde: Date,
    hasta: Date,
  ): Promise<LineaCalidadDto> {
    const [recepcion, clasificacion, aptos, noAptos, totalLotesSistema] = await Promise.all([
      this.loteRepo.count({ where: { empresaId, fechaIngreso: Between(desde, hasta) } }),
      this.loteRepo
        .createQueryBuilder('lote')
        .where('lote.empresaId = :empresaId', { empresaId })
        .andWhere('lote.fechaIngreso BETWEEN :desde AND :hasta', { desde, hasta })
        .andWhere('lote.clasificacion IS NOT NULL')
        .getCount(),
      this.loteRepo.count({
        where: { empresaId, clasificacion: ClasificacionLote.APTO, fechaIngreso: Between(desde, hasta) },
      }),
      this.loteRepo.count({
        where: { empresaId, clasificacion: ClasificacionLote.NO_APTO, fechaIngreso: Between(desde, hasta) },
      }),
      this.loteRepo.count({ where: { empresaId } }),
    ]);

    return { recepcion, clasificacion, aptos, noAptos, totalLotesSistema };
  }

  // --- Helpers ---

  private buildMetrica(valor: number, valorAnterior: number): MetricaDto {
    const variacion = valor - valorAnterior;
    const tendencia: Tendencia = variacion > 0 ? 'sube' : variacion < 0 ? 'baja' : 'igual';
    return { valor, valorAnterior, tendencia, variacion };
  }

  private rangoDelDia(diasAtras: number): { desde: Date; hasta: Date } {
    const desde = new Date();
    desde.setDate(desde.getDate() - diasAtras);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(desde);
    hasta.setHours(23, 59, 59, 999);
    return { desde, hasta };
  }

  private buildRangos() {
    const hoy = this.rangoDelDia(0);
    const ayer = this.rangoDelDia(1);
    return {
      hoyDesde: hoy.desde,
      hoyHasta: hoy.hasta,
      ayerDesde: ayer.desde,
      ayerHasta: ayer.hasta,
    };
  }
}