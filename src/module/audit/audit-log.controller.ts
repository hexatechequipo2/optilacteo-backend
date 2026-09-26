import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { TIPO_ACCION_LABELS } from './enums/tipo-accion.enum';

@ApiTags('audit-log')
@ApiBearerAuth()
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(ROLES.GERENTE)
  @ApiOperation({
    summary:
      'Historial de auditoría, con filtros por usuario, acción, tipo y período. ADMIN ve todas las empresas, GERENTE solo la propia.',
  })
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: QueryAuditLogDto,
  ) {
    return this.auditLogService.findAll(tenant, query);
  }

  @Get('tipos')
  @Roles(ROLES.GERENTE)
  @ApiOperation({
    summary: 'Catálogo de tipos de acción, para el filtro "Tipo de acción" del log.',
  })
  getTipos() {
    return Object.entries(TIPO_ACCION_LABELS).map(([value, label]) => ({
      value,
      label,
    }));
  }

  @Get('export')
  @Roles(ROLES.GERENTE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({
    summary:
      'Exporta a CSV el log de auditoría filtrado (mismos filtros que el listado).',
  })
  async export(
    @CurrentEmpresa() tenant: TenantContext,
    @Query() query: QueryAuditLogDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.auditLogService.exportarCsv(tenant, query);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }
}