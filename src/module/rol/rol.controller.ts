import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { RolService } from './rol.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdatePermisoDto } from '../permiso/dto/update-permiso.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from './constants/roles.constants';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@ApiTags('rol')
@ApiBearerAuth()
@ApiExcludeController()
@Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
@Controller('rol')
export class RolController {
  constructor(private readonly rolService: RolService) {}

  @Post()
  @AuditLog('ROL_CREAR', 'Rol')
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolService.create(createRolDto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId?: string) {
    if (empresaId) {
      return this.rolService.findByEmpresa(+empresaId);
    }
    return this.rolService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolService.findOne(+id);
  }

  @Patch(':id')
  @AuditLog('ROL_ACTUALIZAR', 'Rol')
  update(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolService.update(+id, updateRolDto);
  }

  @Patch(':id/permisos')
  @AuditLog('ROL_PERMISOS_ACTUALIZAR', 'Rol')
  updatePermiso(
    @Param('id') id: string,
    @Body() dto: UpdatePermisoDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.rolService.updatePermiso(+id, dto, tenant);
  }

  @Delete(':id')
  @AuditLog('ROL_ELIMINAR', 'Rol')
  remove(@Param('id') id: string) {
    return this.rolService.remove(+id);
  }
}