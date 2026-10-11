// module/rol/rol.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import {
  ConEmpresaObjetivo,
  EmpresaObjetivo,
} from '../../common/tenant/empresa-objetivo';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { AsignarRolDto } from './dto/asignar-rol.dto';
import { GuardarRolDto } from './dto/guardar-rol.dto';
import { RolService } from './rol.service';

const GR = ModuloAdministrativo.GESTION_ROLES;

// Todos los endpoints operan sobre la empresa que resuelve @ConEmpresaObjetivo():
// la propia, o la de ?empresaId= para el Administrador (HU-72, criterio 5).
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolController {
  constructor(private readonly service: RolService) {}

  @Get()
  @Permissions(GR, PermissionAction.READ)
  @ConEmpresaObjetivo()
  listar(@EmpresaObjetivo() empresaId: number) {
    return this.service.listar(empresaId);
  }

  @Post()
  @Permissions(GR, PermissionAction.CREATE)
  @ConEmpresaObjetivo()
  @AuditLog('ROL_CREAR', 'Rol', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as
      | { nombre?: string; despues?: unknown }
      | undefined;
    return `Rol ${b?.nombre ?? '?'} creado. Permisos: ${JSON.stringify(b?.despues)}`;
  })
  crear(@EmpresaObjetivo() empresaId: number, @Body() dto: GuardarRolDto) {
    return this.service.crear(empresaId, dto);
  }

  // Ruta fija ANTES de ':id' para que no se confunda con un parámetro
  @Put('usuarios/:usuarioId')
  @Permissions(GR, PermissionAction.UPDATE)
  @ConEmpresaObjetivo()
  @AuditLog('ROL_ASIGNAR', 'Usuario', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as
      | { usuarioId?: number; rolAnterior?: string; rolNuevo?: string }
      | undefined;
    return `Usuario ${b?.usuarioId}: rol ${b?.rolAnterior ?? 'sin rol'} → ${b?.rolNuevo}`;
  })
  asignar(
    @EmpresaObjetivo() empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: AsignarRolDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.asignarRol(usuarioId, dto.rolId, empresaId, actor);
  }

  @Put(':id')
  @Permissions(GR, PermissionAction.UPDATE)
  @ConEmpresaObjetivo()
  @AuditLog('ROL_ACTUALIZAR', 'Rol', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as
      | { nombre?: string; antes?: unknown; despues?: unknown }
      | undefined;
    return `Rol ${b?.nombre}. Antes: ${JSON.stringify(b?.antes)} | Después: ${JSON.stringify(b?.despues)}`;
  })
  actualizar(
    @EmpresaObjetivo() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarRolDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.actualizar(id, empresaId, dto, actor);
  }

  @Delete(':id')
  @Permissions(GR, PermissionAction.DELETE)
  @ConEmpresaObjetivo()
  @AuditLog('ROL_ELIMINAR', 'Rol', TipoAccion.CONFIGURACION, (ctx) => {
    const b = ctx.responseBody as
      | { nombre?: string; antes?: unknown }
      | undefined;
    return `Rol ${b?.nombre} eliminado. Permisos que tenía: ${JSON.stringify(b?.antes)}`;
  })
  eliminar(
    @EmpresaObjetivo() empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.eliminar(id, empresaId);
  }
}
