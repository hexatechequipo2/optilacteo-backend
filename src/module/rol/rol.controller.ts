import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolService } from './rol.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdatePermisoDto } from '../permiso/dto/update-permiso.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from './constants/roles.constants';

@ApiTags('rol')
@Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
@Controller('rol')
export class RolController {
  constructor(private readonly rolService: RolService) {}

  @Post()
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
  update(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolService.update(+id, updateRolDto);
  }

  @Patch(':id/permisos')
  updatePermiso(@Param('id') id: string, @Body() dto: UpdatePermisoDto) {
    return this.rolService.updatePermiso(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolService.remove(+id);
  }
}