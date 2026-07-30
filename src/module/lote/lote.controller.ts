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
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { LoteFilterQueryDto } from './dto/lote-filter-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RevisarLoteDto } from './dto/revisar-lote.dto';

@ApiTags('lote')
@ApiBearerAuth()
@Controller('lotes')
@UseGuards(RolesGuard, PermissionsGuard)
export class LoteController {
  constructor(private readonly loteService: LoteService) {}

  // HU-60: registro de lotes — solo Responsable de calidad.
  @Post()
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('LOTE_REGISTRAR', 'Lote')
  create(
    @Body() createLoteDto: CreateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.create(createLoteDto, tenant);
  }

  @Get()
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
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
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR, ROLES.OPERARIO_LINEA)
  @Permissions([ModuloSistema.MONITOREO_ALERTAS], 'canRead')
  getMetricasCalidad(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.getMetricasCalidad(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('LOTE_ACTUALIZAR', 'Lote')
  update(
    @Param('id') id: string,
    @Body() updateLoteDto: UpdateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.update(+id, updateLoteDto, tenant);
  }

  @Patch(':id/finalizar')
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('LOTE_FINALIZAR', 'Lote')
  finalizar(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.finalizar(+id, tenant);
  }

  // HU-21 (AC7): historial de clasificaciones automáticas del lote.
  @Get(':id/clasificaciones')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions([ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD], 'canRead')
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
    const usuarioId = req.user.sub;
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
}