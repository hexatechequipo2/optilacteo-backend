import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
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
import { SkuService } from './sku.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';

// HU-67: catálogo de SKU de producto terminado, configurable por empresa.
@ApiTags('sku')
@ApiBearerAuth()
@Controller('skus')
@UseGuards(RolesGuard, PermissionsGuard)
export class SkuController {
  constructor(private readonly skuService: SkuService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('SKU_REGISTRAR', 'Sku')
  create(@Body() dto: CreateSkuDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.create(dto, tenant);
  }

  // Alimenta el selector "Buscar SKU..." del form de ingreso a cámara.
  @Get()
  @Roles(
    ROLES.ADMINISTRADOR,
    ROLES.GERENTE,
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.OPERARIO_LINEA,
  )
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  findAll(@CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.findAll(tenant);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('SKU_ACTUALIZAR', 'Sku')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSkuDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.skuService.update(+id, dto, tenant);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('SKU_DESACTIVAR', 'Sku')
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.deactivate(+id, tenant);
  }
  
  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('SKU_ACTIVAR', 'Sku')
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.activate(+id, tenant);
  }
}