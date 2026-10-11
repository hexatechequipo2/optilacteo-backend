import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { IngresoCamaraService } from './ingreso-camara.service';
import { CreateIngresoCamaraDto } from './dto/create-ingreso-camara.dto';
import { IngresoCamaraFilterQueryDto } from './dto/ingreso-camara-filter-query.dto';
import { PermissionAction } from '../../common/enums/permission-action.enum';

// HU-67: registro de ingreso a cámara de producto terminado.
@ApiTags('ingreso-camara')
@ApiBearerAuth()
@Controller('ingresos-camara')
export class IngresoCamaraController {
  constructor(private readonly ingresoCamaraService: IngresoCamaraService) {}

  @Post()
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.CREATE)
  @AuditLog('INGRESO_CAMARA_REGISTRAR', 'IngresoCamara', TipoAccion.ALTA)
  create(
    @Body() dto: CreateIngresoCamaraDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.ingresoCamaraService.create(dto, tenant);
  }

  @Get()
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findAll(
    @Query() query: IngresoCamaraFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.ingresoCamaraService.findAll(query, tenant);
  }
}