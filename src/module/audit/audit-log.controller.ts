import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import type { TenantContext } from '../../common/types/tenant-context.type';

// AJUSTAR: reemplazar por el decorator real que arma el TenantContext
// a partir del request (probablemente ya existe como @CurrentEmpresa()
// o similar, según se menciona en el plan de seguridad).
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';

@ApiTags('audit-log')
@ApiBearerAuth()
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @ApiOperation({
    summary:
      'Historial de auditoría. ADMIN ve todas las empresas, GERENTE solo la propia.',
  })
  findAll(
    @CurrentEmpresa() tenant: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findAll(
      tenant,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}