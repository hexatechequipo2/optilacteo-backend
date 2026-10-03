import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { SensorService } from './sensor.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorFilterQueryDto } from './dto/sensor-filter-query.dto';
import { AsociarLoteDto } from './dto/asociar-lote.dto';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';


@ApiTags('sensor')
@ApiBearerAuth()
@Controller('sensores')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  // HU-17: registro de sensores — solo Jefe de Producción.
  @Post()
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.CREATE)
  @AuditLog('SENSOR_REGISTRAR', 'Sensor', TipoAccion.ALTA)
  create(
    @Body() createSensorDto: CreateSensorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.create(createSensorDto, tenant);
  }

  //HU-65 El Gerente quiere mantener un listado de todos los sensores con su ubicación, marca y tipo, es por eso que el @Roles está en el GET.
  @Get()
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.READ)
  findAll(
    @Query() query: SensorFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.findAll(query, tenant);
  }

  @Get(':id')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.sensorService.findOne(+id, tenant);
  }

  @Get(':id/historial')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.READ)
  historialPorSensor(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.historialPorSensor(+id, tenant);
  }

  @Patch(':id')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.UPDATE)
  @AuditLog('SENSOR_ACTUALIZAR', 'Sensor', TipoAccion.EDICION)
  update(
    @Param('id') id: string,
    @Body() updateSensorDto: UpdateSensorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.update(+id, updateSensorDto, tenant);
  }

  // HU-33: asociar uno o más sensores a un lote — Operario de línea.
  @Patch('lote/:loteId/asociar')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.UPDATE)
  @AuditLog('SENSOR_ASOCIAR_LOTE', 'Sensor', TipoAccion.EDICION)
  asociarALote(
    @Param('loteId') loteId: string,
    @Body() dto: AsociarLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por tu @CurrentUser() real
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const usuarioId = req.user.sub;
    return this.sensorService.asociarALote(
      +loteId,
      dto.sensorIds,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      usuarioId,
      tenant,
    );
  }

  // Soft-delete: pasa el sensor a estado INACTIVO en vez de borrarlo físicamente.
  @Delete(':id')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.DELETE)
  @AuditLog('SENSOR_ELIMINAR', 'Sensor', TipoAccion.BAJA)
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.sensorService.remove(+id, tenant);
  }

  // Reactiva un sensor previamente desactivado (estado INACTIVO -> ACTIVO).
  @Patch(':id/activar')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.UPDATE)
  @AuditLog('SENSOR_ACTIVAR', 'Sensor', TipoAccion.ALTA)
  activar(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.sensorService.activar(+id, tenant);
  }
}