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
import type { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ProveedorFilterQueryDto } from './dto/proveedor-filter-query.dto';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('proveedores')
@ApiBearerAuth()
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  @Permissions(ModuloSistema.RECEPCION, PermissionAction.READ)
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: ProveedorFilterQueryDto,
  ): Promise<PaginatedResponse<ProveedorResponseDto>> {
    return this.proveedoresService.findAll(tenant, query);
  }

  @Get(':id')
  @Permissions(ModuloSistema.RECEPCION, PermissionAction.READ)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.findOne(id, tenant);
  }

  @Post()
  @Permissions(ModuloSistema.RECEPCION, PermissionAction.CREATE)
  @HttpCode(HttpStatus.CREATED)
  @AuditLog('PROVEEDOR_CREAR', 'Proveedor', TipoAccion.ALTA)
  create(
    @Body() createProveedorDto: CreateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.create(createProveedorDto, tenant);
  }

  @Patch(':id')
  @Permissions(ModuloSistema.RECEPCION, PermissionAction.UPDATE)
  @AuditLog('PROVEEDOR_ACTUALIZAR', 'Proveedor', TipoAccion.EDICION)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProveedorDto: UpdateProveedorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.update(id, updateProveedorDto, tenant);
  }

  @Patch(':id/activar')
  @Permissions(ModuloSistema.RECEPCION, PermissionAction.UPDATE)
  @AuditLog('PROVEEDOR_ACTIVAR', 'Proveedor', TipoAccion.ALTA)
  activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.activate(id, tenant);
  }

  @Delete(':id')
  @Permissions(ModuloSistema.RECEPCION, PermissionAction.DELETE)
  @AuditLog('PROVEEDOR_ELIMINAR', 'Proveedor', TipoAccion.BAJA)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    await this.proveedoresService.remove(id, tenant);
    return { message: `Proveedor con id "${id}" eliminado correctamente` };
  }
}