import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';

@ApiTags('proveedores')
@Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  findAll(@CurrentEmpresa() tenant: TenantContext): Promise<ProveedorResponseDto[]> {
    return this.proveedoresService.findAll(tenant);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.findOne(id, tenant);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createProveedorDto: CreateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.create(createProveedorDto, tenant);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProveedorDto: UpdateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.update(id, updateProveedorDto, tenant);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentEmpresa() tenant: TenantContext) {
    await this.proveedoresService.remove(id, tenant);
    return { message: `Proveedor con id "${id}" eliminado correctamente` };
  }
}