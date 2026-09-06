import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';

import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';

import { PrediccionVolumenService } from './prediccion-volumen.service';
import { PrediccionVolumenQueryDto } from './dto/prediccion-volumen-query.dto';

@ApiTags('prediccion-volumen')
@ApiBearerAuth()
@Controller('prediccion-volumen')
@UseGuards(RolesGuard, PermissionsGuard)
export class PrediccionVolumenController {
  constructor(
    private readonly prediccionVolumenService: PrediccionVolumenService,
  ) {}

  // HU-51 criterios 1, 2, 3, 4, 5, 8 (el móvil consume el mismo GET)
  @Get()
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.REPORTES_FORECAST, 'canRead')
  obtener(
    @Query() query: PrediccionVolumenQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.prediccionVolumenService.obtenerParaDashboard(
      tenant.empresaId!,
      query,
    );
  }

  // HU-51 criterio 7
  @Get('exportar/csv')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.REPORTES_FORECAST, 'canRead')
  @ApiProduces('text/csv')
  async exportarCsv(
    @Query() query: PrediccionVolumenQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.prediccionVolumenService.exportarCsv(
      tenant.empresaId!,
      query,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="prediccion-volumen-${query.tipoMateriaPrima}.csv"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}