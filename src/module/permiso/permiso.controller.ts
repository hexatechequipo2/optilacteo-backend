import { Controller, Get, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { PermisoService } from './permiso.service';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { ROLES } from '../rol/constants/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('permiso')
@ApiBearerAuth()
@ApiExcludeController()
@Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @Get()
  findByRol(@Query('rolId') rolId: string) {
    return this.permisoService.findByRol(+rolId);
  }

  @Get('usuario/:userId')
  findByUsuario(@Param('userId') userId: string) {
    return this.permisoService.findByUsuario(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permisoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePermisoDto) {
    return this.permisoService.update(+id, dto);
  }
}