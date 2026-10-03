import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { PermisoService } from './permiso.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { ModuloAdministrativo } from './enums/modulo-administrativo.enum';

@ApiTags('permiso')
@ApiBearerAuth()
@ApiExcludeController()
@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @Get()
  @Permissions(ModuloAdministrativo.GESTION_ROLES, PermissionAction.READ)
  findByRol(
    @Query('rolId') rolId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.findByRol(+rolId, tenant.empresaId!);
  }

  @Get('usuario/:userId')
  @Permissions(ModuloAdministrativo.GESTION_ROLES, PermissionAction.READ)
  findByUsuario(
    @Param('userId') userId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.findByUsuario(+userId, tenant.empresaId!);
  }

  @Get(':id')
  @Permissions(ModuloAdministrativo.GESTION_ROLES, PermissionAction.READ)
  findOne(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.findOne(+id, tenant.empresaId!);
  }
}