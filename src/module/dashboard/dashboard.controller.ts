import {
  Controller,
  Get,
  ParseIntPipe,
  ParseEnumPipe,
  Query,
  UseGuards,
  DefaultValuePipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
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
import {
  DashboardHistoricoDto,
  GranularidadHistorico,
} from './dto/dashboard-historico.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.DASHBOARD, 'canRead')
  @ApiQuery({
    name: 'granularidad',
    enum: GranularidadHistorico,
    required: false,
  })
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query(
      'granularidad',
      new DefaultValuePipe(GranularidadHistorico.DIA),
      new ParseEnumPipe(GranularidadHistorico),
    )
    granularidad: GranularidadHistorico,
  ): Promise<DashboardResponseDto> {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.dashboardService.getDashboard(tenant, granularidad);
  }

  @Get('lotes-procesados/historico')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.DASHBOARD, 'canRead')
  @ApiQuery({
    name: 'granularidad',
    enum: GranularidadHistorico,
    required: false,
  })
  @ApiQuery({ name: 'cantidad', type: Number, required: false })
  getHistorico(
    @CurrentEmpresa() tenant: TenantContext,
    @Query(
      'granularidad',
      new DefaultValuePipe(GranularidadHistorico.DIA),
      new ParseEnumPipe(GranularidadHistorico),
    )
    granularidad: GranularidadHistorico,
    @Query('cantidad', new DefaultValuePipe(7), ParseIntPipe) cantidad: number,
  ): Promise<DashboardHistoricoDto> {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.dashboardService.getHistoricoLotesProcesados(
      tenant,
      granularidad,
      cantidad,
    );
  }
}
