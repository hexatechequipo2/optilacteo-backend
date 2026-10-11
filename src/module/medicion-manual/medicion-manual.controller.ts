// medicion-manual/medicion-manual.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { MedicionManualService } from './medicion-manual.service';
import { CreateMedicionManualLoteDto } from './dto/create-medicion-manual-lote.dto';
import { HistorialMedicionManualFilterQueryDto } from './dto/historial-medicion-manual-filter-query.dto';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('medicion-manual')
@ApiBearerAuth()
@Controller('lotes/:id/mediciones-manuales')
export class MedicionManualController {
  constructor(private readonly medicionManualService: MedicionManualService) {}

  // AC13: solo Operario de línea puede registrar (matriz de permisos).
  @Post()
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.CREATE)
  @AuditLog('MEDICION_MANUAL_LOTE_REGISTRAR', 'MedicionManualLote', TipoAccion.ALTA)
  registrar(
    @Param('id') id: string,
    @Body() dto: CreateMedicionManualLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por @CurrentUser() real, mismo TODO que lectura-sensor
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const usuarioId = req.user.sub;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.medicionManualService.registrar(+id, dto, usuarioId, tenant);
  }

  @Get()
  @Permissions(
    [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
    PermissionAction.READ,
  )
  historial(
    @Param('id') id: string,
    @Query() query: HistorialMedicionManualFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.medicionManualService.historial(+id, query, tenant);
  }
}
