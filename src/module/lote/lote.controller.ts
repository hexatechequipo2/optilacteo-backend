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
import { Roles } from '../../common/decorators/roles.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { LoteService } from './lote.service';
import { LoteTrazabilidadService } from './lote-trazabilidad.service'; // <-- NUEVO (HU-32)
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { LoteFilterQueryDto } from './dto/lote-filter-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RevisarLoteDto } from './dto/revisar-lote.dto';
import { FinalizarLoteDto } from './dto/finalizar-lote.dto';
import { CreateLoteConsumoDto } from './dto/create-lote-consumo.dto';
import { LoteConsumoService } from './lote-consumo.service';

@ApiTags('lote')
@ApiBearerAuth()
@Controller('lotes')
@UseGuards(RolesGuard, PermissionsGuard)
export class LoteController {
  constructor(
    private readonly loteService: LoteService,
    private readonly loteConsumoService: LoteConsumoService,
    private readonly loteTrazabilidadService: LoteTrazabilidadService, // <-- NUEVO (HU-32)
  ) {}

  // HU-60: registro de lotes — solo Responsable de calidad.
  @Post()
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('LOTE_REGISTRAR', 'Lote')
  create(
    @Body() createLoteDto: CreateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.create(createLoteDto, tenant);
  }

  @Get()
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
    ROLES.OPERARIO_LINEA,
    ROLES.RESPONSABLE_PRODUCCION,
  )
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canRead')
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
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  findNoAptos(@CurrentEmpresa() tenant: TenantContext) {
    return this.loteService.findNoAptos(tenant);
  }

  // HU-68: selector de lotes de producción existentes para el frontend.
  @Get('producciones')
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  findLotesProduccion(@CurrentEmpresa() tenant: TenantContext) {
    return this.loteConsumoService.findLotesProduccion(tenant);
  }

  // HU-66: histórico de desvíos entre lo comprometido (remito) y lo real
  // recibido, agrupado por proveedor. Va ANTES de @Get(':id') por el mismo
  // motivo que 'no-aptos' y 'producciones' — si no, Nest interpreta
  // 'proveedor' como el :id.
  @Get('proveedor/:proveedorId/desvios')
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canRead')
  getDesviosPorProveedor(
    @Param('proveedorId') proveedorId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getDesviosPorProveedor(+proveedorId, tenant);
  }

  @Get(':id')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canRead')
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.loteService.findOne(+id, tenant);
  }

  // HU-18: snapshot inicial para la pantalla de monitoreo de calidad.
  // TODO: confirmar si existe (o hay que crear) un rol ROLES.OPERARIO —
  // la HU pide explícitamente "operario de línea" y hoy no vimos ese rol
  // en roles.constants. Mientras tanto se habilita para los roles que ya
  // pueden leer lotes; ajustar cuando se confirme.
  @Get(':id/metricas-calidad')
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
    ROLES.OPERARIO_LINEA,
  )
  @Permissions([ModuloSistema.MONITOREO_ALERTAS], 'canRead')
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
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  getTrazabilidad(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteTrazabilidadService.getTrazabilidad(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('LOTE_ACTUALIZAR', 'Lote')
  update(
    @Param('id') id: string,
    @Body() updateLoteDto: UpdateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.update(+id, updateLoteDto, tenant);
  }

  @Patch(':id/finalizar')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.RESPONSABLE_PRODUCCION)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('LOTE_FINALIZAR', 'Lote')
  finalizar(
    @Param('id') id: string,
    @Body() dto: FinalizarLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.finalizar(+id, dto, tenant);
  }

  // HU-21 (AC7): historial de clasificaciones automáticas del lote.
  @Get(':id/clasificaciones')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(
    [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
    'canRead',
  )
  getHistorialClasificaciones(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getHistorialClasificaciones(+id, tenant);
  }

  // HU-22: aprobación o rechazo manual de un lote No Apto.
  @Post(':id/revision')
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('LOTE_REVISAR', 'Lote')
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
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  getHistorialRevisiones(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getHistorialRevisiones(+id, tenant);
  }

  // HU-24: comparación del lote contra el promedio histórico de la empresa.
  @Get(':id/comparacion-historica')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  compararConHistorico(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.compararConHistorico(+id, tenant);
  }

  // HU-68: registrar consumo parcial de un lote de ingreso.
  @Post(':id/consumos')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.RESPONSABLE_PRODUCCION)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('LOTE_CONSUMO_REGISTRAR', 'LoteConsumo')
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
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  getHistorialConsumos(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteConsumoService.historial(+id, tenant);
  }
}
