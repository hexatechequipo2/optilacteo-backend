// module/rol/rol.controller.ts
import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { AsignarRolDto } from './dto/asignar-rol.dto';
import { GuardarRolDto } from './dto/guardar-rol.dto';
import { RolService } from './rol.service';

const GR = ModuloAdministrativo.GESTION_ROLES;

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolController {
  constructor(private readonly service: RolService) {}

  @Get()
  @Permissions(GR, PermissionAction.READ)
  listar(@CurrentEmpresa() t: TenantContext) {
    return this.service.listar(this.emp(t));
  }

  @Post()
  @Permissions(GR, PermissionAction.CREATE)
  @AuditLog('ROL_CREAR', 'Rol', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as { nombre?: string; despues?: unknown } | undefined;
    return `Rol ${b?.nombre ?? '?'} creado. Permisos: ${JSON.stringify(b?.despues)}`;
  })
  crear(@CurrentEmpresa() t: TenantContext, @Body() dto: GuardarRolDto) {
    return this.service.crear(this.emp(t), dto);
  }

  // Ruta fija ANTES de ':id' para que no se confunda con un parámetro
  @Put('usuarios/:usuarioId')
  @Permissions(GR, PermissionAction.UPDATE)
  @AuditLog('ROL_ASIGNAR', 'Usuario', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as { usuarioId?: number; rolAnterior?: string; rolNuevo?: string } | undefined;
    return `Usuario ${b?.usuarioId}: rol ${b?.rolAnterior ?? 'sin rol'} → ${b?.rolNuevo}`;
  })
  asignar(
    @CurrentEmpresa() t: TenantContext,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: AsignarRolDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.asignarRol(usuarioId, dto.rolId, this.emp(t), actor);
  }

  @Put(':id')
  @Permissions(GR, PermissionAction.UPDATE)
  @AuditLog('ROL_ACTUALIZAR', 'Rol', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as { nombre?: string; antes?: unknown; despues?: unknown } | undefined;
    return `Rol ${b?.nombre}. Antes: ${JSON.stringify(b?.antes)} | Después: ${JSON.stringify(b?.despues)}`;
  })
  actualizar(
    @CurrentEmpresa() t: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarRolDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.actualizar(id, this.emp(t), dto, actor);
  }

  @Delete(':id')
  @Permissions(GR, PermissionAction.DELETE)
  @AuditLog('ROL_ELIMINAR', 'Rol', TipoAccion.CONFIGURACION)
  eliminar(@CurrentEmpresa() t: TenantContext, @Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id, this.emp(t));
  }

  private emp(t: TenantContext): number {
    if (t.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return t.empresaId;
  }
}