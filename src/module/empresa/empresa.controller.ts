import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ToggleModuloDto } from './dto/toggle-modulo.dto';
import { ROLES } from '../rol/constants/roles.constants';

@ApiTags('empresa')
@Roles(ROLES.ADMINISTRADOR)
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresaService.create(createEmpresaDto);
  }

  @Get()
  findAll() {
    return this.empresaService.findAll();
  }

  @Get('me')
  findMine(@CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.findMine(tenant);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.findOne(+id, tenant);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.update(+id, updateEmpresaDto, tenant);
  }

  @Patch(':id/activar')
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.activate(+id, tenant);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.deactivate(+id, tenant);
  }

  @Patch(':id/modulos/activar')
  activarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.activarModulo(+id, dto, tenant);
  }

  @Patch(':id/modulos/desactivar')
  desactivarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.desactivarModulo(+id, dto, tenant);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.remove(+id, tenant);
  }
}