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
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { ROLES } from '../rol/constants/roles.constants';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { MedicionManualService } from './medicion-manual.service';
import { CreateMedicionManualLoteDto } from './dto/create-medicion-manual-lote.dto';
import { HistorialMedicionManualFilterQueryDto } from './dto/historial-medicion-manual-filter-query.dto';

@ApiTags('medicion-manual')
@ApiBearerAuth()
@Controller('lotes/:id/mediciones-manuales')
@UseGuards(RolesGuard, PermissionsGuard)
export class MedicionManualController {
  constructor(private readonly medicionManualService: MedicionManualService) {}

  // AC13: solo Operario de línea puede registrar (matriz de permisos).
  @Post()
  @Roles(ROLES.OPERARIO_LINEA)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.MONITOREO_ALERTAS],
    'canWrite',
  )
  @AuditLog('MEDICION_MANUAL_LOTE_REGISTRAR', 'MedicionManualLote')
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
  @Roles(
    ROLES.OPERARIO_LINEA,
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions(
    [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
    'canRead',
  )
  historial(
    @Param('id') id: string,
    @Query() query: HistorialMedicionManualFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.medicionManualService.historial(+id, query, tenant);
  }
}
