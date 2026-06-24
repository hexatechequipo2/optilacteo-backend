import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ToggleModuloDto } from './dto/toggle-modulo.dto';

@ApiTags('empresa')
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmpresaDto: UpdateEmpresaDto) {
    return this.empresaService.update(+id, updateEmpresaDto);
  }

  @Patch(':id/activar')
  activate(@Param('id') id: string) {
    return this.empresaService.activate(+id);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string) {
    return this.empresaService.deactivate(+id);
  }

  @Patch(':id/modulos/activar')
  activarModulo(@Param('id') id: string, @Body() dto: ToggleModuloDto) {
    return this.empresaService.activarModulo(+id, dto);
  }

  @Patch(':id/modulos/desactivar')
  desactivarModulo(@Param('id') id: string, @Body() dto: ToggleModuloDto) {
    return this.empresaService.desactivarModulo(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.empresaService.remove(+id);
  }
}