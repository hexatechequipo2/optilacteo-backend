import { Controller, Get, Post, Body, Patch, Param, Req } from '@nestjs/common';
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
import {
  ConEmpresaObjetivo,
  EmpresaObjetivo,
} from '../../common/tenant/empresa-objetivo';
import { registrarCambiosAuditoria } from '../audit/decorators/audit-log.decorator';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // HU-72 criterio 5: empresaId (body o query) elige la empresa solo para el Administrador.
  @Post()
  @Permissions(ModuloAdministrativo.GESTION_USUARIOS, PermissionAction.CREATE)
  @ConEmpresaObjetivo()
  @AuditLog('USUARIO_CREAR', 'Usuario', TipoAccion.ALTA, (ctx) => {
    const b = ctx.responseBody as
      | { email?: string; rolNombre?: string; empresa?: { id?: number } }
      | undefined;
    return `Alta de usuario ${b?.email} con rol ${b?.rolNombre} en empresa #${b?.empresa?.id}`;
  })
  async create(
    @Body() dto: CreateUserDto,
    @EmpresaObjetivo() empresaId: number,
    @Req() req: object,
  ) {
    const usuario = await this.userService.create(dto, empresaId);
    registrarCambiosAuditoria(req, {
      antes: null,
      despues: {
        rolId: usuario.rolId,
        rolNombre: usuario.rolNombre,
        empresaId: usuario.empresa?.id ?? null,
      },
    });
    return usuario;
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
  @ConEmpresaObjetivo()
  @AuditLog('USUARIO_ACTUALIZAR', 'Usuario', TipoAccion.EDICION)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @EmpresaObjetivo() empresaId: number,
    @Req() req: object,
  ) {
    const { usuario, cambios } = await this.userService.update(
      +id,
      dto,
      empresaId,
    );
    registrarCambiosAuditoria(req, cambios);
    return usuario;
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
