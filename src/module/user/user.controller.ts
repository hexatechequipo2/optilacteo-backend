import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { UserFilterQueryDto } from './dto/user-filter-query.dto';
import { Query } from '@nestjs/common';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.CREATE)
  @AuditLog('USUARIO_CREAR', 'Usuario', TipoAccion.ALTA)
  create(@Body() dto: CreateUserDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.create(dto, tenant);
  }

  @Get()
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.READ)
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: UserFilterQueryDto,
  ) {
    return this.userService.findAll(tenant, query);
  }

  @Get(':id')
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.UPDATE)
  @AuditLog('USUARIO_ACTUALIZAR', 'Usuario', TipoAccion.EDICION)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.userService.update(+id, dto, tenant);
  }

  @Patch(':id/activar')
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.UPDATE)
  @AuditLog('USUARIO_ACTIVAR', 'Usuario', TipoAccion.ALTA)
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.activate(+id, tenant);
  }

  @Patch(':id/desactivar')
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.UPDATE)
  @AuditLog('USUARIO_DESACTIVAR', 'Usuario', TipoAccion.BAJA)
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.deactivate(+id, tenant);
  }

  @Patch(':id/desbloquear')
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.UPDATE)
  @AuditLog('USUARIO_DESBLOQUEAR', 'Usuario', TipoAccion.EDICION)
  unlock(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.unlock(+id, tenant);
  }
}
