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
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { ConfiguracionComparacionHistoricaService } from './configuracion-comparacion-historica.service';
import { UpdateConfiguracionComparacionHistoricaDto } from './dto/update-configuracion-comparacion-historica.dto';

@ApiTags('configuracion-comparacion-historica')
@ApiBearerAuth()
@Controller('config-parametros/comparacion-historica')
@UseGuards(RolesGuard, PermissionsGuard)
export class ConfiguracionComparacionHistoricaController {
  constructor(
    private readonly service: ConfiguracionComparacionHistoricaService,
  ) {}

  @Get()
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE)
  @Permissions(ModuloSistema.TRAZABILIDAD, 'canRead')
  get(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.service.getConfig(tenant.empresaId);
  }

  @Patch()
  @Roles(ROLES.GERENTE)
  @Permissions(ModuloSistema.TRAZABILIDAD, 'canWrite')
  @AuditLog(
    'CONFIG_COMPARACION_HISTORICA_ACTUALIZAR',
    'ConfiguracionComparacionHistorica',
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
