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
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { SkuService } from './sku.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { PermissionAction } from '../../common/enums/permission-action.enum';

// HU-67: catálogo de SKU de producto terminado, configurable por empresa.
@ApiTags('sku')
@ApiBearerAuth()
@Controller('skus')
export class SkuController {
  constructor(private readonly skuService: SkuService) {}

  @Post()
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.CREATE)
  @AuditLog('SKU_REGISTRAR', 'Sku', TipoAccion.ALTA)
  create(@Body() dto: CreateSkuDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.create(dto, tenant);
  }

  // Alimenta el selector "Buscar SKU..." del form de ingreso a cámara.
  @Get()
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findAll(@CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.findAll(tenant);
  }

  @Patch(':id')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.UPDATE)
  @AuditLog('SKU_ACTUALIZAR', 'Sku', TipoAccion.EDICION)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSkuDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.skuService.update(+id, dto, tenant);
  }

  @Delete(':id')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.DELETE)
  @AuditLog('SKU_DESACTIVAR', 'Sku', TipoAccion.BAJA)
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.deactivate(+id, tenant);
  }

  @Patch(':id/activar')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.UPDATE)
  @AuditLog('SKU_ACTIVAR', 'Sku', TipoAccion.ALTA)
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.skuService.activate(+id, tenant);
  }
}