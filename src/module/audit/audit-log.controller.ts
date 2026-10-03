import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { TIPO_ACCION_LABELS } from './enums/tipo-accion.enum';

const AUDITORIA = ModuloAdministrativo.AUDITORIA;

@ApiTags('audit-log')
@ApiBearerAuth()
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions(AUDITORIA, PermissionAction.READ)
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
  @Permissions(AUDITORIA, PermissionAction.READ)
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
  @Permissions(AUDITORIA, PermissionAction.EXPORT)
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