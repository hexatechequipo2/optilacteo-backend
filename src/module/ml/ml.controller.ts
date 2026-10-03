import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MlService } from './ml.service';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('recomendaciones')
@ApiBearerAuth()
@Controller('recomendaciones')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  // HU-49 AC4 / HU-37: aceptar o rechazar la recomendación, con registro
  // del resultado real y, si difiere del recomendado, de la justificación.
  @Patch(':id/responder')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.UPDATE)
  @AuditLog('RECOMENDACION_RESPONDER', 'RecomendacionDestino',TipoAccion.EDICION)
  responder(
    @Param('id') id: string,
    @Body() dto: ResponderRecomendacionDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por tu @CurrentUser() real (ver LoteController)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const usuarioId = req.user.sub;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.mlService.responderRecomendacion(+id, dto, tenant, usuarioId);
  }

  // HU-49: recomendación pendiente de un lote específico, para que el
  // frontend deje de depender de un mock.
  @Get('lote/:loteId')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  recomendacionPendientePorLote(
    @Param('loteId') loteId: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.mlService.recomendacionPendientePorLote(+loteId, tenant);
  }

  // HU-49: historial de aciertos del modelo, para consulta agregada.
  @Get('historial')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  historial(@CurrentEmpresa() tenant: TenantContext) {
    return this.mlService.historialAciertos(tenant);
  }

  // HU-37 AC8: reporte de lotes con divergencias justificadas
  // (recomendaciones rechazadas: destino elegido != destino recomendado).
  @Get('divergencias')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  historialDivergencias(@CurrentEmpresa() tenant: TenantContext) {
    return this.mlService.historialDivergencias(tenant);
  }

  @Get('todas')
  @Permissions([ModuloSistema.TRAZABILIDAD], PermissionAction.READ)
  obtenerTodas(@CurrentEmpresa() tenant: TenantContext) {
    return this.mlService.obtenerTodas(tenant);
  }
}