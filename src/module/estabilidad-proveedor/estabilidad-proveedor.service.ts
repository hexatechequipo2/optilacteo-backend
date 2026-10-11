
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Lote } from '../lote/entities/lote.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { ProveedorEstabilidad } from './entities/proveedor-estabilidad.entity';
import { EstabilidadProveedorResponseDto } from './dto/estabilidad-proveedor-response.dto';

import type {
  ClasificarEstabilidadResultado,
  IEstabilidadClient,
  SerieEstabilidad,
} from './interfaces/estabilidad-client.interface';

import { ESTABILIDAD_CLIENT } from './interfaces/estabilidad-client.interface';

// HU-64 AC4: mínimo de lotes históricos.
export const MIN_LOTES_ESTABILIDAD = 5;
export const MAX_LOTES_VENTANA = 50;

@Injectable()
export class EstabilidadProveedorService {
  private readonly logger = new Logger(
    EstabilidadProveedorService.name,
  );

  constructor(
    @Inject(ESTABILIDAD_CLIENT)
    private readonly client: IEstabilidadClient,

    @InjectRepository(ProveedorEstabilidad)
    private readonly estabilidadRepo: Repository<ProveedorEstabilidad>,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,

    @InjectRepository(ConfiguracionParametro)
    private readonly configRepo: Repository<ConfiguracionParametro>,
  ) {}

  /**
   * HU-64 AC3:
   * Se llama al crear un lote.
   * Nunca propaga errores.
   */
  async recalcularBestEffort(
    proveedorId: number,
    empresaId: number,
  ): Promise<void> {
    try {
      await this.recalcular(proveedorId, empresaId);
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.stack ?? err.message : String(err);

      this.logger.error(
        `Error al recalcular estabilidad del proveedor ${proveedorId}: ${mensaje}`,
      );
    }
  }

  /**
   * Recalcula la estabilidad de un proveedor
   * usando sus lotes históricos.
   */
  async recalcular(
    proveedorId: number,
    empresaId: number,
  ): Promise<void> {
    // Solo se consideran lotes con parámetros cargados.
    const lotes = await this.loteRepo
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.parametros', 'p')
      .where('l.proveedorId = :proveedorId', { proveedorId })
      .andWhere('l.empresaId = :empresaId', { empresaId })
      .orderBy('l.fechaIngreso', 'DESC')
      .addOrderBy('l.id', 'DESC')
      .take(MAX_LOTES_VENTANA)
      .getMany();

    // Verifica si hay suficientes lotes históricos.
    if (lotes.length < MIN_LOTES_ESTABILIDAD) {
      await this.guardar(
        proveedorId,
        empresaId,
        lotes.length,
        {
          status: 'insufficient_data',
        },
      );
      return;
    }

    // Obtiene la configuración de parámetros de la empresa.
    const configs = await this.configRepo.find({
      where: { empresaId },
    });

    const mapaConfig = new Map(
      configs.map((c) => [
        `${c.parametro}|${c.tipoMateriaPrima}`,
        c,
      ]),
    );

    // Construye las series históricas por parámetro
    // y tipo de materia prima.
    const series = new Map<string, SerieEstabilidad>();

    for (const lote of lotes) {
      for (const p of lote.parametros ?? []) {
        const key = `${p.parametro}|${lote.materiaPrima}`;

        if (!series.has(key)) {
          const cfg = mapaConfig.get(key);

          series.set(key, {
            parametro: p.parametro,
            materiaPrima: lote.materiaPrima,
            valores: [],
            umbralMin: cfg ? Number(cfg.umbralMin) : null,
            umbralMax: cfg ? Number(cfg.umbralMax) : null,
          });
        }

        series.get(key)!.valores.push(Number(p.valor));
      }
    }

    // Solicita la clasificación al cliente de estabilidad.
    const resultado = await this.client.clasificar({
      empresaId,
      proveedorId,
      series: Array.from(series.values()),
    });

    // Persiste el resultado.
    await this.guardar(
      proveedorId,
      empresaId,
      lotes.length,
      resultado,
    );
  }

  /**
   * Backfill único:
   * recalcula todos los proveedores que tienen lotes.
   */
  async recalcularTodos(): Promise<
    { proveedorId: number; empresaId: number }[]
  > {
    const pares = await this.loteRepo
      .createQueryBuilder('l')
      .select('l.proveedorId', 'proveedorId')
      .addSelect('l.empresaId', 'empresaId')
      .distinct(true)
      .getRawMany<{
        proveedorId: number;
        empresaId: number;
      }>();

    for (const p of pares) {
      await this.recalcularBestEffort(
        Number(p.proveedorId),
        Number(p.empresaId),
      );
    }

    return pares.map((p) => ({
      proveedorId: Number(p.proveedorId),
      empresaId: Number(p.empresaId),
    }));
  }

  /**
   * Obtiene la estabilidad para la ficha del proveedor.
   * No realiza llamadas al servicio de ML.
   */
  async obtener(
    proveedorId: number,
    empresaId: number,
  ): Promise<EstabilidadProveedorResponseDto> {
    const e = await this.estabilidadRepo.findOne({
      where: { proveedorId, empresaId },
    });

    if (!e || e.status !== 'ok') {
      return {
        status: 'insufficient_data',
        mensaje: 'Sin datos suficientes',
        cantidadLotes: e?.cantidadLotes ?? 0,
        minimoLotes: MIN_LOTES_ESTABILIDAD,
      };
    }

    return {
      status: 'ok',
      clasificacion: e.clasificacion,
      score: Number(e.score),
      detalle: e.detalle,
      cantidadLotes: e.cantidadLotes,
      calculadoEn: e.calculadoEn,
    };
  }

  /**
   * Guarda o actualiza el resultado de estabilidad.
   */
  private async guardar(
    proveedorId: number,
    empresaId: number,
    cantidadLotes: number,
    r: ClasificarEstabilidadResultado,
  ): Promise<void> {
    const entity =
      (await this.estabilidadRepo.findOne({
        where: { proveedorId, empresaId },
      })) ??
      this.estabilidadRepo.create({
        proveedorId,
        empresaId,
      });

    // Los resultados distintos de "ok" se tratan como
    // datos insuficientes.
    entity.status =
      r.status === 'ok' ? 'ok' : 'insufficient_data';

    entity.clasificacion = r.clasificacion ?? null;

    entity.score =
      r.score != null ? String(r.score) : null;

    entity.detalle = r.detalle ?? [];
    entity.cantidadLotes = cantidadLotes;
    entity.modeloVersion = r.modeloVersion ?? null;

    await this.estabilidadRepo.save(entity);
  }
}