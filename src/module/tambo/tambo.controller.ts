import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { TamboService } from './tambo.service';
import { CreateTamboDto } from './dto/create-tambo.dto';
import { UpdateTamboDto } from './dto/update-tambo.dto';

// SUPUESTO: mismos módulos de permisos que usa LoteController para todo
// lo que toca proveedor/origen del lote (RECEPCION + TRAZABILIDAD).
// Ajustar si proveedores/tambos viven bajo otro ModuloSistema.
//
// SUPUESTO de roles: quien da de alta/baja/reactiva proveedores/tambos
// (catálogo) es RESPONSABLE_CALIDAD o ADMINISTRADOR; para leer (poblar
// combos del form de carga de lote) se habilita a los mismos roles que
// ya pueden leer lotes en LoteController.findAll. Ajustar según cómo
// esté armado tu proveedor.controller.ts real.
@ApiTags('tambos')
@ApiBearerAuth()
@Controller('tambos')
@UseGuards(RolesGuard, PermissionsGuard)
export class TamboController {
  constructor(private readonly tamboService: TamboService) {}

  @Post()
  @Roles(ROLES.OPERARIO_LINEA, ROLES.GERENTE)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('TAMBO_REGISTRAR', 'Tambo')
  create(@Body() dto: CreateTamboDto, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.create(dto, tenant);
  }

  @Get()
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
    ROLES.OPERARIO_LINEA,
    ROLES.RESPONSABLE_PRODUCCION,
  )
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canRead')
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query('proveedorId') proveedorId?: string,
  ) {
    // GET /tambos?proveedorId=xxx -> select encadenado del form de lote (HU-36)
    if (proveedorId) {
      return this.tamboService.findByProveedor(+proveedorId, tenant);
    }
    return this.tamboService.findAll(tenant);
  }

  @Get(':id')
  @Roles(
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
    ROLES.OPERARIO_LINEA,
    ROLES.RESPONSABLE_PRODUCCION,
  )
  @Permissions([ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD], 'canRead')
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('TAMBO_ACTUALIZAR', 'Tambo')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTamboDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.tamboService.update(+id, dto, tenant);
  }

  // Reactivación explícita — separado del PATCH genérico a propósito
  // (ver nota en UpdateTamboDto).
  @Patch(':id/activar')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('TAMBO_ACTIVAR', 'Tambo')
  activar(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.activar(+id, tenant);
  }

  // Baja lógica (soft delete) — ver TamboService.remove().
  @Delete(':id')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.TRAZABILIDAD],
    'canWrite',
  )
  @AuditLog('TAMBO_BAJA', 'Tambo')
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.tamboService.remove(+id, tenant);
  }
}
