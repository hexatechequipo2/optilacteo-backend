import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { TamboService } from './tambo.service';
import { CreateTamboDto } from './dto/create-tambo.dto';
import { UpdateTamboDto } from './dto/update-tambo.dto';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('tambos')
@ApiBearerAuth()
@Controller('tambos')
export class TamboController {
  constructor(private readonly tamboService: TamboService) {}

  @Post()
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.CREATE,
  )
  @AuditLog('TAMBO_REGISTRAR', 'Tambo', TipoAccion.ALTA)
  create(@Body() dto: CreateTamboDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.create(dto, tenant);
  }

  @Get()
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query('proveedorId') proveedorId?: string,
  ) {
    if (proveedorId) {
      return this.tamboService.findByProveedor(+proveedorId, tenant);
    }
    return this.tamboService.findAll(tenant);
  }

  @Get(':id')
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.UPDATE,
  )
  @AuditLog('TAMBO_ACTUALIZAR', 'Tambo', TipoAccion.EDICION)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTamboDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.tamboService.update(+id, dto, tenant);
  }

  // Reactivación explícita — separado del PATCH genérico a propósito
  // (ver nota en UpdateTamboDto).
  @Patch(':id/activar')
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.UPDATE,
  )
  @AuditLog('TAMBO_ACTIVAR', 'Tambo', TipoAccion.ALTA)
  activar(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.activar(+id, tenant);
  }

  // Baja lógica (soft delete) — ver TamboService.remove().
  @Delete(':id')
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    PermissionAction.DELETE,
  )
  @AuditLog('TAMBO_BAJA', 'Tambo', TipoAccion.BAJA)
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.remove(+id, tenant);
  }
}