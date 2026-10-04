import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { ConfiguracionComparacionHistoricaService } from './configuracion-comparacion-historica.service';
import { UpdateConfiguracionComparacionHistoricaDto } from './dto/update-configuracion-comparacion-historica.dto';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('configuracion-comparacion-historica')
@ApiBearerAuth()
@Controller('config-parametros/comparacion-historica')
export class ConfiguracionComparacionHistoricaController {
  constructor(
    private readonly service: ConfiguracionComparacionHistoricaService,
  ) {}

  @Get()
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.READ,
  )
  get(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.service.getConfig(tenant.empresaId);
  }

  @Patch()
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.UPDATE,
  )
  @AuditLog(
    'CONFIG_COMPARACION_HISTORICA_ACTUALIZAR',
    'ConfiguracionComparacionHistorica',
    TipoAccion.CONFIGURACION,
  )
  update(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: UpdateConfiguracionComparacionHistoricaDto,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.service.update(tenant.empresaId, dto);
  }
}
