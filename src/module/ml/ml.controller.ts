import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MlService } from './ml.service';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';

@ApiTags('recomendaciones')
@ApiBearerAuth()
@Controller('recomendaciones')
@UseGuards(RolesGuard, PermissionsGuard)
export class MlController {
  constructor(private readonly mlService: MlService) {}

  // HU-49 AC4: aceptar o rechazar la recomendación, con registro del
  // resultado real.
  @Patch(':id/responder')
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canWrite')
  @AuditLog('RECOMENDACION_RESPONDER', 'RecomendacionDestino')
  responder(
    @Param('id') id: string,
    @Body() dto: ResponderRecomendacionDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.mlService.responderRecomendacion(+id, dto, tenant);
  }

  // HU-49: recomendación pendiente de un lote específico, para que el
  // frontend deje de depender de un mock.
  @Get('lote/:loteId')
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  recomendacionPendientePorLote(
    @Param('loteId') loteId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.mlService.recomendacionPendientePorLote(+loteId, tenant);
  }

  // HU-49: historial de aciertos del modelo, para consulta agregada.
  @Get('historial')
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.TRAZABILIDAD], 'canRead')
  historial(@CurrentEmpresa() tenant: TenantContext) {
    return this.mlService.historialAciertos(tenant);
  }
}