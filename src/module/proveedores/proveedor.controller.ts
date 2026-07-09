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
  Query,
} from '@nestjs/common';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { ProveedoresService } from './proveedor.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { ProveedorFilterQueryDto } from './dto/proveedor-filter-query.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@ApiTags('proveedores')
@ApiBearerAuth()
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: ProveedorFilterQueryDto,
  ): Promise<PaginatedResponse<ProveedorResponseDto>> {
    return this.proveedoresService.findAll(tenant, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.findOne(id, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditLog('PROVEEDOR_CREAR', 'Proveedor')
  create(
    @Body() createProveedorDto: CreateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.create(createProveedorDto, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id')
  @AuditLog('PROVEEDOR_ACTUALIZAR', 'Proveedor')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProveedorDto: UpdateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.update(id, updateProveedorDto, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id/activar')
  @AuditLog('PROVEEDOR_ACTIVAR', 'Proveedor')
  activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.activate(id, tenant);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Delete(':id')
  @AuditLog('PROVEEDOR_ELIMINAR', 'Proveedor')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentEmpresa() tenant: TenantContext) {
    await this.proveedoresService.remove(id, tenant);
    return { message: `Proveedor con id "${id}" eliminado correctamente` };
  }

}