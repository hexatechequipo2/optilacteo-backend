import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ROLES } from '../rol/constants/roles.constants';
import { LoteService } from './lote.service';
import { LoteTrazabilidadService } from './lote-trazabilidad.service'; // <-- NUEVO (HU-32)
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { LoteFilterQueryDto } from './dto/lote-filter-query.dto';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RevisarLoteDto } from './dto/revisar-lote.dto';
import { FinalizarLoteDto } from './dto/finalizar-lote.dto';
import { CreateLoteConsumoDto } from './dto/create-lote-consumo.dto';
import { AsignarDestinoProductivoDto } from './dto/asignar-destino-productivo.dto'; // <-- NUEVO (HU-34)
import { LoteConsumoService } from './lote-consumo.service';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { PermissionAction } from '../../common/enums/permission-action.enum';


@ApiTags('lote')
@ApiBearerAuth()
@Controller('lotes')
export class LoteController {
  constructor(
    private readonly loteService: LoteService,
    private readonly loteConsumoService: LoteConsumoService,
    private readonly loteTrazabilidadService: LoteTrazabilidadService, // <-- NUEVO (HU-32)
  ) {}

  // HU-60: registro de lotes — solo Responsable de calidad.
  @Post()
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.CREATE,
  )
  @AuditLog('LOTE_REGISTRAR', 'Lote', TipoAccion.ALTA)
  create(
    @Body() createLoteDto: CreateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.create(createLoteDto, tenant);
  }

  @Get()
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findAll(
    @Query() query: LoteFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.findAll(query, tenant);
  }

  // HU-22: listado de lotes pendientes de revisión manual.
  // Tiene que ir ANTES de @Get(':id'): si no, Nest interpreta "no-aptos"
  // como el parámetro :id y nunca llega acá.
  @Get('no-aptos')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findNoAptos(@CurrentEmpresa() tenant: TenantContext) {
    return this.loteService.findNoAptos(tenant);
  }

  // HU-68: selector de lotes de producción existentes para el frontend.
  @Get('producciones')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findLotesProduccion(@CurrentEmpresa() tenant: TenantContext) {
    return this.loteConsumoService.findLotesProduccion(tenant);
  }

  // HU-66: histórico de desvíos entre lo comprometido (remito) y lo real
  // recibido, agrupado por proveedor. Va ANTES de @Get(':id') por el mismo
  // motivo que 'no-aptos' y 'producciones' — si no, Nest interpreta
  // 'proveedor' como el :id.
  @Get('proveedor/:proveedorId/desvios')
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  getDesviosPorProveedor(
    @Param('proveedorId') proveedorId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getDesviosPorProveedor(+proveedorId, tenant);
  }

  @Get(':id')
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.loteService.findOne(+id, tenant);
  }

  // HU-18: snapshot inicial para la pantalla de monitoreo de calidad.
  // TODO: confirmar si existe (o hay que crear) un rol ROLES.OPERARIO —
  // la HU pide explícitamente "operario de línea" y hoy no vimos ese rol
  // en roles.constants. Mientras tanto se habilita para los roles que ya
  // pueden leer lotes; ajustar cuando se confirme.
  @Get(':id/metricas-calidad')
  @Permissions([ModuloSistema.MONITOREO_ALERTAS], PermissionAction.READ)
  getMetricasCalidad(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getMetricasCalidad(+id, tenant);
  }

  // HU-32: historial completo de trazabilidad del lote — cronológico e
  // inmutable, desde la recepción hasta el producto terminado. Solo
  // lectura agregada de tablas append-only, no se toca ningún dato.
  @Get(':id/trazabilidad')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  getTrazabilidad(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteTrazabilidadService.getTrazabilidad(+id, tenant);
  }

  // HU-49: la recomendación de destino productivo se muestra y confirma
  // desde este mismo endpoint (modal "Editar lote"), y está dirigida
  // explícitamente al Responsable de producción — se habilita el rol acá
  // junto con Responsable de calidad, que ya podía editar el lote.
  @Patch(':id')
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.UPDATE,
  )
  @AuditLog('LOTE_ACTUALIZAR', 'Lote', TipoAccion.EDICION)
  update(
    @Param('id') id: string,
    @Body() updateLoteDto: UpdateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.update(+id, updateLoteDto, tenant);
  }

  // HU-34 AC1/AC3: asignación o cambio manual del destino productivo del
  // lote, independiente de aceptar/rechazar una recomendación ML (HU-49).
  @Patch(':id/destino-productivo')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.UPDATE)
  @AuditLog('LOTE_DESTINO_ASIGNAR', 'Lote', TipoAccion.EDICION)
  asignarDestinoProductivo(
    @Param('id') id: string,
    @Body() dto: AsignarDestinoProductivoDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por tu @CurrentUser() real
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const usuarioId = req.user.sub;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.loteService.asignarDestinoProductivo(+id, dto, tenant, usuarioId);
  }

  // HU-34 AC2: historial unificado de cambios de destino productivo del
  // lote (asignaciones manuales + aceptaciones/rechazos de recomendaciones ML).
  @Get(':id/destino-productivo/historial')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  getHistorialDestinoProductivo(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getHistorialDestino(+id, tenant);
  }

  @Patch(':id/finalizar')
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.UPDATE,
  )
  @AuditLog('LOTE_FINALIZAR', 'Lote', TipoAccion.EDICION)
  finalizar(
    @Param('id') id: string,
    @Body() dto: FinalizarLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.finalizar(+id, dto, tenant);
  }

  // HU-21 (AC7): historial de clasificaciones automáticas del lote.
  @Get(':id/clasificaciones')
  @Permissions(
    [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
    PermissionAction.READ,
  )
  getHistorialClasificaciones(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getHistorialClasificaciones(+id, tenant);
  }

  // HU-22: aprobación o rechazo manual de un lote No Apto.
  @Post(':id/revision')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.CREATE)
  @AuditLog('LOTE_REVISAR', 'Lote', TipoAccion.EDICION)
  revisar(
    @Param('id') id: string,
    @Body() dto: RevisarLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por tu @CurrentUser() real
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const usuarioId = req.user.sub;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.loteService.revisarLote(+id, dto, tenant, usuarioId);
  }

  @Get(':id/revisiones')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  getHistorialRevisiones(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getHistorialRevisiones(+id, tenant);
  }

  // HU-24: comparación del lote contra el promedio histórico de la empresa.
  @Get(':id/comparacion-historica')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  compararConHistorico(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.compararConHistorico(+id, tenant);
  }

  // HU-68: registrar consumo parcial de un lote de ingreso.
  @Post(':id/consumos')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.CREATE)
  @AuditLog('LOTE_CONSUMO_REGISTRAR', 'LoteConsumo', TipoAccion.ALTA)
  registrarConsumo(
    @Param('id') id: string,
    @Body() dto: CreateLoteConsumoDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const usuarioId = req.user.sub;

    return this.loteConsumoService.registrarConsumo(
      +id,
      dto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      usuarioId,
      tenant,
    );
  }

  // HU-68 (criterios 2 y 4): historial de consumos parciales de un lote de ingreso.
  @Get(':id/consumos')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  getHistorialConsumos(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteConsumoService.historial(+id, tenant);
  }

  // HU-45: descarga del reporte de trazabilidad en PDF, para presentar
  // ante inspecciones del CAA/SENASA. Reutiliza los mismos datos de HU-32.
  @Get(':id/reporte-trazabilidad')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  @AuditLog('LOTE_REPORTE_TRAZABILIDAD_GENERAR', 'Lote', TipoAccion.EXPORTACION)
  async getReporteTrazabilidad(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.loteTrazabilidadService.generarReportePdf(+id, tenant);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="trazabilidad-lote-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}