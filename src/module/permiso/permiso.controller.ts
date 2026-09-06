import { Controller, Get, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { PermisoService } from './permiso.service';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { ROLES } from '../rol/constants/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';

@ApiTags('permiso')
@ApiBearerAuth()
@ApiExcludeController()
@Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @Get()
  findByRol(
    @Query('rolId') rolId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.findByRol(+rolId, tenant.empresaId!);
  }

  @Get('usuario/:userId')
  findByUsuario(
    @Param('userId') userId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.findByUsuario(+userId, tenant.empresaId!);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.findOne(+id, tenant.empresaId!);
  }

  @Patch(':id')
  @AuditLog('PERMISO_ACTUALIZAR', 'Permiso')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermisoDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.permisoService.update(+id, tenant.empresaId!, dto);
  }
}