import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  ForbiddenException,
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
import { ConfigParametroService } from './config-parametro.service';
import { CreateConfigParametroDto } from './dto/create-config-parametro.dto';
import { UpdateConfigParametroDto } from './dto/update-config-parametro.dto';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';

@ApiTags('config-parametros')
@ApiBearerAuth()
@Controller('config-parametros')
@UseGuards(RolesGuard, PermissionsGuard)
export class ConfigParametroController {
  constructor(
    private readonly configParametroService: ConfigParametroService,
  ) {}

  @Post()
  @Roles(ROLES.GERENTE)
  @Permissions(ModuloSistema.SENSORES_IOT, 'canWrite')
  @AuditLog('CONFIG_PARAMETRO_CREAR', 'ConfiguracionParametro')
  crear(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: CreateConfigParametroDto,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.crear(tenant.empresaId, dto);
  }

  @Put(':id')
  @Roles(ROLES.GERENTE)
  @Permissions(ModuloSistema.SENSORES_IOT, 'canWrite')
  @AuditLog('CONFIG_PARAMETRO_ACTUALIZAR', 'ConfiguracionParametro')
  editar(
    @CurrentEmpresa() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigParametroDto,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.editar(tenant.empresaId, id, dto);
  }

  @Get()
  @Roles(ROLES.GERENTE)
  @Permissions(ModuloSistema.SENSORES_IOT, 'canRead')
  listar(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.listarPorEmpresa(tenant.empresaId);
  }

  @Delete(':id')
  @Roles(ROLES.GERENTE)
  @Permissions(ModuloSistema.SENSORES_IOT, 'canWrite')
  @AuditLog('CONFIG_PARAMETRO_ELIMINAR', 'ConfiguracionParametro')
  eliminar(
    @CurrentEmpresa() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.eliminar(tenant.empresaId, id);
  }
}
