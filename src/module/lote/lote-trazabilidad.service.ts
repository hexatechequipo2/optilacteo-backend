import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TenantContext } from '../../common/types/tenant-context.type';
import type { ILoteRepository } from './repository/lote-repository.interface';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';
import { LoteRevisionCalidad } from './entities/lote-revision-calidad.entity';
import { LoteUbicacionHistorial } from './entities/lote-ubicacion-historial.entity';
import { IngresoCamara } from './entities/ingreso-camara.entity';
import { ClasificacionLoteService } from './clasificacion-lote.service';
import { LoteConsumoService } from './lote-consumo.service';
import { EstadoLote } from './enums/estado-lote.enum';
import { TipoEventoTrazabilidad } from './enums/tipo-evento-trazabilidad.enum';
import {
  EventoTrazabilidadDto,
  TrazabilidadLoteResponseDto,
} from './dto/trazabilidad-lote-response.dto';

@Injectable()
export class LoteTrazabilidadService {
  constructor(
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @InjectRepository(LoteRevisionCalidad)
    private readonly loteRevisionRepository: Repository<LoteRevisionCalidad>,
    @InjectRepository(LoteUbicacionHistorial)
    private readonly ubicacionHistorialRepository: Repository<LoteUbicacionHistorial>,
    @InjectRepository(IngresoCamara)
    private readonly ingresoCamaraRepository: Repository<IngresoCamara>,
    private readonly clasificacionLoteService: ClasificacionLoteService,
    private readonly loteConsumoService: LoteConsumoService,
  ) {}

  // HU-32: reconstruye el historial completo de un lote, desde la
  // recepción hasta el producto terminado, en orden cronológico.
  async getTrazabilidad(
    id: number,
    tenant: TenantContext,
  ): Promise<TrazabilidadLoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    // AC2: identificador único inexistente -> error, sin filtrar datos
    // de otra empresa ni de otro lote.
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    const eventos: EventoTrazabilidadDto[] = [];

    // 1. Recepción
    eventos.push({
      tipo: TipoEventoTrazabilidad.RECEPCION,
      fecha: lote.fechaIngreso,
      descripcion: `Ingreso de materia prima (${lote.materiaPrima})`,
      detalle: {
        codigo: lote.codigo,
        proveedorId: lote.proveedorId,
        tamboId: lote.tamboId,
        materiaPrima: lote.materiaPrima,
        cantidad: lote.cantidad,
        cantidadComprometidaKg: lote.cantidadComprometidaKg,
        parametros: lote.parametros?.map((p) => ({
          parametro: p.parametro,
          valor: p.valor,
          valorComprometido: p.valorComprometido,
        })),
      },
    });

    // 2. Clasificaciones automáticas (ya inmutable, HU-21)
    const clasificaciones = await this.clasificacionLoteService.historialDeLote(
      id,
      empresaId,
    );
    for (const c of clasificaciones) {
      eventos.push({
        tipo: TipoEventoTrazabilidad.CLASIFICACION,
        fecha: c.createdAt,
        descripcion: `Clasificado como ${c.clasificacion}`,
        detalle: {
          clasificacion: c.clasificacion,
          parametrosUtilizados: c.parametrosUtilizados,
        },
      });
    }

    // 3. Revisiones manuales de calidad (HU-22)
    const revisiones = await this.loteRevisionRepository.find({
      where: { loteId: id, empresaId },
      order: { createdAt: 'ASC' },
    });
    for (const r of revisiones) {
      eventos.push({
        tipo: TipoEventoTrazabilidad.REVISION_CALIDAD,
        fecha: r.createdAt,
        descripcion: `Revisión manual: ${r.decision}`,
        detalle: {
          decision: r.decision,
          justificacion: r.justificacion,
          usuarioId: r.usuarioId,
        },
      });
    }

    // 4. Cambios de ubicación (ej. entrada a cámara física por sensor)
    const ubicaciones = await this.ubicacionHistorialRepository.find({
      where: { loteId: id, empresaId },
      order: { fecha: 'ASC' },
    });
    for (const u of ubicaciones) {
      eventos.push({
        tipo: TipoEventoTrazabilidad.CAMBIO_UBICACION,
        fecha: u.fecha,
        descripcion: `Cambio de ubicación: ${u.ubicacionAnterior ?? 'sin ubicación previa'} → ${u.ubicacionNueva}`,
        detalle: {
          sensorId: u.sensorId,
          ubicacionAnterior: u.ubicacionAnterior,
          ubicacionNueva: u.ubicacionNueva,
          usuarioId: u.userId,
        },
      });
    }

    // 5. Ingresos a cámara por SKU (HU-67)
    const ingresosCamara = await this.ingresoCamaraRepository.find({
      where: { loteId: id, empresaId },
      relations: { sku: true },
      order: { fechaIngreso: 'ASC' },
    });
    for (const ic of ingresosCamara) {
      eventos.push({
        tipo: TipoEventoTrazabilidad.INGRESO_CAMARA,
        fecha: ic.fechaIngreso,
        descripcion: `Ingreso a cámara (SKU: ${ic.sku?.nombre ?? ic.skuId})`,
        detalle: {
          skuId: ic.skuId,
          skuNombre: ic.sku?.nombre,
          cantidad: ic.cantidad,
        },
      });
    }

    // 6. Consumos parciales hacia producción (HU-68)
    const consumos = await this.loteConsumoService.historial(id, tenant);
    for (const c of consumos) {
      eventos.push({
        tipo: TipoEventoTrazabilidad.CONSUMO_PARCIAL,
        fecha: c.createdAt,
        descripcion: `Consumo parcial hacia lote de producción ${c.loteProduccionCodigo}`,
        detalle: {
          cantidad: c.cantidad,
          loteProduccionId: c.loteProduccionId,
          loteProduccionCodigo: c.loteProduccionCodigo,
          parametros: c.parametros,
        },
      });
    }

    // 7. Finalización (producto terminado)
    if (lote.estado === EstadoLote.FINALIZADO) {
      eventos.push({
        tipo: TipoEventoTrazabilidad.FINALIZACION,
        fecha: lote.updatedAt,
        descripcion: 'Lote finalizado',
        detalle: {
          rendimiento: lote.rendimiento,
          unidadRendimiento: lote.unidadRendimiento,
        },
      });
    }

    // AC2: orden cronológico estricto, de recepción a producto terminado.
    eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return {
      loteId: lote.id,
      codigoLote: lote.codigo,
      eventos,
    };
  }

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }
}
