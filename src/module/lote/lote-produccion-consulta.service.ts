import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { LoteProduccion } from './entities/lote-produccion.entity';
import { LoteConsumo } from './entities/lote-consumo.entity';
import { EstadoLote } from './enums/estado-lote.enum';
import { TipoEventoTrazabilidad } from './enums/tipo-evento-trazabilidad.enum';
import { LoteTrazabilidadService } from './lote-trazabilidad.service';
import {
  DESCRIPCION_ESTADO_PRODUCCION,
  EstadoProduccion,
  LoteProduccionFilterQueryDto,
  ProduccionSortField,
} from './dto/lote-produccion-filter-query.dto';

import {
  esFechaCalendarioValida,
  inicioDelDiaEmpresa,
  rangoDiasInclusivoEmpresa,
  sumarDias,
} from '../../common/utils/rango-fechas';

// Un lote de ingreso "cerrado" es finalizado o rechazado; cualquier otro
// estado cuenta como abierto. Constantes del enum, no input del usuario.
const ESTADOS_CERRADOS = [EstadoLote.FINALIZADO, EstadoLote.RECHAZADO];
const esCerrado = (estado: EstadoLote) => ESTADOS_CERRADOS.includes(estado);
const ESTADOS_CERRADOS_SQL = ESTADOS_CERRADOS.map((e) => `'${e}'`).join(', ');

const TIENE_CONSUMOS = `EXISTS (
  SELECT 1 FROM lote_consumo lc WHERE lc."loteProduccionId" = lp.id
)`;
const ORIGEN_ABIERTO = `EXISTS (
  SELECT 1 FROM lote_consumo lc
  INNER JOIN lotes l ON l.id = lc."loteIngresoId"
  WHERE lc."loteProduccionId" = lp.id AND l.estado::text NOT IN (${ESTADOS_CERRADOS_SQL})
)`;
const ESTADO_SQL = `CASE
  WHEN NOT ${TIENE_CONSUMOS} THEN 'sin_consumos'
  WHEN ${ORIGEN_ABIERTO} THEN 'en_proceso'
  ELSE 'finalizado' END`;

// Lista blanca: sortBy nunca se interpola directo en el ORDER BY.
const SORT_SQL: Record<ProduccionSortField, string> = {
  codigo: 'lp.codigo',
  fecha: 'lp.createdAt',
  estado: ESTADO_SQL,
  lotesOrigen: `(SELECT COUNT(DISTINCT lc."loteIngresoId") FROM lote_consumo lc
                 WHERE lc."loteProduccionId" = lp.id)`,
};

const consumeDeOrigenCon = (columna: 'proveedorId' | 'tamboId') =>
  `EXISTS (SELECT 1 FROM lote_consumo lc
             INNER JOIN lotes l ON l.id = lc."loteIngresoId"
            WHERE lc."loteProduccionId" = lp.id AND l."${columna}" = :${columna})`;

export interface LoteProduccionResumen {
  id: number;
  codigo: string;
  fecha: Date; // inicio: creación del lote de producción (primer consumo)
  estado: EstadoProduccion;
  estadoDescripcion: string;
  cantidadLotesOrigen: number;
  // Por unidad: hay ingresos en litros y otros en kg, no se pueden sumar.
  cantidadConsumidaPorUnidad: Record<string, number>;
  proveedores: { id: number; nombre: string }[];
  tambos: { id: number; nombre: string }[];
  lotesOrigen: { id: number; codigo: string }[];
  ultimoConsumo: Date | null;
}

@Injectable()
export class LoteProduccionConsultaService {
  constructor(
    @InjectRepository(LoteProduccion)
    private readonly produccionRepository: Repository<LoteProduccion>,
    @InjectRepository(LoteConsumo)
    private readonly consumoRepository: Repository<LoteConsumo>,
    private readonly loteTrazabilidadService: LoteTrazabilidadService,
  ) {}
// HU-77 (criterios 1-6, 9, 10)
async findAll(
  query: LoteProduccionFilterQueryDto,
  tenant: TenantContext,
) {
  const empresaId = this.resolveEmpresaId(tenant);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  // Validar el formato y la existencia de fechaDesde.
  if (
    query.fechaDesde &&
    !esFechaCalendarioValida(query.fechaDesde)
  ) {
    throw new BadRequestException(
      'fechaDesde debe ser una fecha válida en formato YYYY-MM-DD',
    );
  }

  // Validar el formato y la existencia de fechaHasta.
  if (
    query.fechaHasta &&
    !esFechaCalendarioValida(query.fechaHasta)
  ) {
    throw new BadRequestException(
      'fechaHasta debe ser una fecha válida en formato YYYY-MM-DD',
    );
  }

  // Validar que fechaDesde no sea posterior a fechaHasta.
  if (query.fechaDesde && query.fechaHasta) {
    const rango = rangoDiasInclusivoEmpresa(
      query.fechaDesde,
      query.fechaHasta,
    );

    if (rango.desde >= rango.hastaExclusivo) {
      throw new BadRequestException(
        'fechaDesde no puede ser posterior a fechaHasta',
      );
    }
  }

  const qb = this.produccionRepository
    .createQueryBuilder('lp')
    .where('lp.empresaId = :empresaId', { empresaId });

  // Desde: incluye todo el día inicial.
  if (query.fechaDesde) {
    qb.andWhere('lp.createdAt >= :desde', {
      desde: inicioDelDiaEmpresa(query.fechaDesde),
    });
  }

  // Hasta: incluye todo el día final.
  // Se usa el inicio del día siguiente como límite exclusivo.
  if (query.fechaHasta) {
    qb.andWhere('lp.createdAt < :hastaExclusivo', {
      hastaExclusivo: inicioDelDiaEmpresa(
        sumarDias(query.fechaHasta, 1),
      ),
    });
  }

  if (query.proveedorId) {
    qb.andWhere(consumeDeOrigenCon('proveedorId'), {
      proveedorId: query.proveedorId,
    });
  }

  if (query.tamboId) {
    qb.andWhere(consumeDeOrigenCon('tamboId'), {
      tamboId: query.tamboId,
    });
  }

  if (query.estado) {
    qb.andWhere(`(${ESTADO_SQL}) = :estado`, {
      estado: query.estado,
    });
  }

    const total = await qb.getCount();

    // Paso 1: ids de la página, ordenados por una expresión de lista blanca.
    const filas = await qb
      .clone()
      .select('lp.id', 'id')
      .addSelect(SORT_SQL[query.sortBy ?? 'fecha'], 'orden')
      .orderBy('orden', query.sortOrder ?? 'DESC')
      .addOrderBy('lp.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: number }>();
    const ids = filas.map((f) => Number(f.id));

    // Paso 2: datos completos de esas filas.
    const data = ids.length ? await this.armarResumenes(ids, empresaId) : [];

    const hayFiltros = Boolean(
      query.fechaDesde || query.fechaHasta || query.proveedorId || query.tamboId || query.estado,
    );
    const mensaje =
      total === 0
        ? hayFiltros
          ? 'No se encontraron lotes de producción que coincidan con los filtros seleccionados. Modificá o limpiá los criterios de búsqueda.'
          : 'Todavía no hay lotes de producción registrados.'
        : undefined;

    return { data, total, page, limit, mensaje };
  }

  // HU-77 (criterios 7 y 8): cabecera + orígenes + eventos cronológicos de
  // todos los lotes de ingreso involucrados.
  async getTrazabilidad(id: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);

    const [resumen] = await this.armarResumenes([id], empresaId);
    if (!resumen) {
      throw new NotFoundException(`Lote de producción ${id} no encontrado`);
    }

    const consumos = await this.consumoRepository.find({
      where: { loteProduccionId: id, empresaId },
      relations: { parametros: true, loteIngreso: { proveedor: true, tambo: true } },
      order: { createdAt: 'ASC' },
    });

    const origenes = consumos.map((c) => ({
      consumoId: c.id,
      fecha: c.createdAt,
      cantidad: Number(c.cantidad),
      unidad: c.loteIngreso.unidadCantidad ?? null,
      parametros: c.parametros,
      loteIngreso: {
        id: c.loteIngreso.id,
        codigo: c.loteIngreso.codigo,
        estado: c.loteIngreso.estado,
        proveedor: c.loteIngreso.proveedor?.razonSocial ?? null,
        tambo: c.loteIngreso.tambo?.nombre ?? null,
      },
    }));

    // Eventos de cada lote de ingreso (reutiliza HU-32, que ya valida empresa).
    const idsOrigen = [...new Set(consumos.map((c) => c.loteIngresoId))];
    const trazas = await Promise.all(
      idsOrigen.map((loteId) => this.loteTrazabilidadService.getTrazabilidad(loteId, tenant)),
    );

    const eventos = trazas
      .flatMap((t) =>
        t.eventos
          // Los consumos hacia OTROS lotes de producción no pertenecen a esta traza.
          .filter(
            (e) =>
              e.tipo !== TipoEventoTrazabilidad.CONSUMO_PARCIAL ||
              Number(e.detalle.loteProduccionId) === id,
          )
          .map((e) => ({ ...e, loteOrigenId: t.loteId, loteOrigenCodigo: t.codigoLote })),
      )
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return { loteProduccion: resumen, origenes, eventos };
  }

  private async armarResumenes(ids: number[], empresaId: number): Promise<LoteProduccionResumen[]> {
    const [producciones, consumos] = await Promise.all([
      this.produccionRepository.find({ where: { id: In(ids), empresaId } }),
      this.consumoRepository.find({
        where: { loteProduccionId: In(ids), empresaId },
        relations: { loteIngreso: { proveedor: true, tambo: true } },
      }),
    ]);

    const porId = new Map(producciones.map((p) => [p.id, p]));

    // Respeta el orden de `ids` (el de la página ya ordenada).
    return ids
      .filter((id) => porId.has(id))
      .map((id) => {
        const lp = porId.get(id)!;
        const propios = consumos.filter((c) => c.loteProduccionId === id);

        const proveedores = new Map<number, string>();
        const tambos = new Map<number, string>();
        const origenes = new Map<number, string>();
        const porUnidad: Record<string, number> = {};
        let ultimo: Date | null = null;

        for (const c of propios) {
          const l = c.loteIngreso;
          origenes.set(l.id, l.codigo);
          if (l.proveedor) proveedores.set(l.proveedor.id, l.proveedor.razonSocial);
          if (l.tambo) tambos.set(l.tambo.id, l.tambo.nombre);
          const unidad = l.unidadCantidad ?? 'sin_unidad';
          porUnidad[unidad] = (porUnidad[unidad] ?? 0) + Number(c.cantidad);
          if (!ultimo || c.createdAt > ultimo) ultimo = c.createdAt;
        }

        // Misma regla que ESTADO_SQL (usada para filtrar y ordenar).
        const estado: EstadoProduccion =
          propios.length === 0
            ? 'sin_consumos'
            : propios.some((c) => !esCerrado(c.loteIngreso.estado))
              ? 'en_proceso'
              : 'finalizado';

        const aLista = (m: Map<number, string>) =>
          [...m].map(([mid, nombre]) => ({ id: mid, nombre }));

        return {
          id: lp.id,
          codigo: lp.codigo,
          fecha: lp.createdAt,
          estado,
          estadoDescripcion: DESCRIPCION_ESTADO_PRODUCCION[estado],
          cantidadLotesOrigen: origenes.size,
          cantidadConsumidaPorUnidad: porUnidad,
          proveedores: aLista(proveedores),
          tambos: aLista(tambos),
          lotesOrigen: [...origenes].map(([oid, codigo]) => ({ id: oid, codigo })),
          ultimoConsumo: ultimo,
        };
      });
  }

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException('No se pudo determinar la empresa del usuario autenticado');
    }
    return tenant.empresaId;
  }
}