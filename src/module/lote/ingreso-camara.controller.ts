import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { IngresoCamaraService } from './ingreso-camara.service';
import { CreateIngresoCamaraDto } from './dto/create-ingreso-camara.dto';
import { IngresoCamaraFilterQueryDto } from './dto/ingreso-camara-filter-query.dto';

// HU-67: registro de ingreso a cámara de producto terminado.
@ApiTags('ingreso-camara')
@ApiBearerAuth()
@Controller('ingresos-camara')
@UseGuards(RolesGuard, PermissionsGuard)
export class IngresoCamaraController {
  constructor(private readonly ingresoCamaraService: IngresoCamaraService) {}

  @Post()
  @Roles(ROLES.RESPONSABLE_PRODUCCION)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('INGRESO_CAMARA_REGISTRAR', 'IngresoCamara')
  create(
    @Body() dto: CreateIngresoCamaraDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.ingresoCamaraService.create(dto, tenant);
  }

  @Get()
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  findAll(
    @Query() query: IngresoCamaraFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.ingresoCamaraService.findAll(query, tenant);
  }
}
