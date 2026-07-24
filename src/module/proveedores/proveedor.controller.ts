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
  UseGuards,
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
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ProveedorFilterQueryDto } from './dto/proveedor-filter-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('proveedores')
@ApiBearerAuth()
@Controller('proveedores')
@UseGuards(RolesGuard, PermissionsGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR, ROLES.RESPONSABLE_CALIDAD)
  @Permissions(ModuloSistema.RECEPCION, 'canRead')
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: ProveedorFilterQueryDto,
  ): Promise<PaginatedResponse<ProveedorResponseDto>> {
    return this.proveedoresService.findAll(tenant, query);
  }

  @Get(':id')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR, ROLES.RESPONSABLE_CALIDAD)
  @Permissions(ModuloSistema.RECEPCION, 'canRead')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.findOne(id, tenant);
  }

  @Post()
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.RECEPCION, 'canWrite')
  @HttpCode(HttpStatus.CREATED)
  @AuditLog('PROVEEDOR_CREAR', 'Proveedor')
  create(
    @Body() createProveedorDto: CreateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.create(createProveedorDto, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.RECEPCION, 'canWrite')
  @AuditLog('PROVEEDOR_ACTUALIZAR', 'Proveedor')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProveedorDto: UpdateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.update(id, updateProveedorDto, tenant);
  }

  @Patch(':id/activar')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.RECEPCION, 'canWrite')
  @AuditLog('PROVEEDOR_ACTIVAR', 'Proveedor')
  activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.activate(id, tenant);
  }

  @Delete(':id')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.RECEPCION, 'canWrite')
  @AuditLog('PROVEEDOR_ELIMINAR', 'Proveedor')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentEmpresa() tenant: TenantContext) {
    await this.proveedoresService.remove(id, tenant);
    return { message: `Proveedor con id "${id}" eliminado correctamente` };
  }

}