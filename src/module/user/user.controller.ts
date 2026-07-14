import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { UserFilterQueryDto } from './dto/user-filter-query.dto';
import { Query } from '@nestjs/common';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Post()
  @AuditLog('USUARIO_CREAR', 'Usuario')
  create(@Body() dto: CreateUserDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.create(dto, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Get()
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: UserFilterQueryDto,
  ) {
    return this.userService.findAll(tenant, query);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.findOne(+id, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id')
  @AuditLog('USUARIO_ACTUALIZAR', 'Usuario')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.update(+id, dto, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id/activar')
  @AuditLog('USUARIO_ACTIVAR', 'Usuario')
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.activate(+id, tenant);
  }
  
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id/desactivar')
  @AuditLog('USUARIO_DESACTIVAR', 'Usuario')
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.deactivate(+id, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id/desbloquear')
  @AuditLog('USUARIO_DESBLOQUEAR', 'Usuario')
  unlock(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.userService.unlock(+id, tenant);
  }
}