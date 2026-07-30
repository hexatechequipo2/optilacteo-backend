import { Controller, Get, ParseIntPipe, Query, UseGuards, DefaultValuePipe, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { DashboardHistoricoDto } from './dto/dashboard-historico.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.DASHBOARD, 'canRead')
  findAll(@CurrentEmpresa() tenant: TenantContext): Promise<DashboardResponseDto> {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.dashboardService.getDashboard(tenant);
  }

  @Get('lotes-procesados/historico')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.DASHBOARD, 'canRead')
  getHistorico(
    @CurrentEmpresa() tenant: TenantContext,
    @Query('dias', new DefaultValuePipe(7), ParseIntPipe) dias: number,
  ): Promise<DashboardHistoricoDto> {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.dashboardService.getHistoricoLotesProcesados(tenant, dias);
  }
}