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
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresaService.create(createEmpresaDto);
  }

  @Get()
  @Roles(ROLES.ADMINISTRADOR)
  findAll() {
    return this.empresaService.findAll();
  }

  @Get('me')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  findMine(@CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.findMine(tenant);
  }

  @Get(':id')
  @Roles(ROLES.ADMINISTRADOR)
  findOne(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.update(+id, updateEmpresaDto, tenant);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.activate(+id, tenant);
  }

  @Patch(':id/desactivar')
  @Roles(ROLES.ADMINISTRADOR)
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.deactivate(+id, tenant);
  }

  @Patch(':id/modulos/activar')
  @Roles(ROLES.ADMINISTRADOR)
  activarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.activarModulo(+id, dto, tenant);
  }

  @Patch(':id/modulos/desactivar')
  @Roles(ROLES.ADMINISTRADOR)
  desactivarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.desactivarModulo(+id, dto, tenant);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.remove(+id, tenant);
  }
}