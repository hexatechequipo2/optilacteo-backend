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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { SensorService } from './sensor.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorFilterQueryDto } from './dto/sensor-filter-query.dto';
import { AsociarLoteDto } from './dto/asociar-lote.dto';

@ApiTags('sensor')
@ApiBearerAuth()
@Controller('sensores')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  // HU-17: registro de sensores — solo Jefe de Producción.
  @Post()
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('SENSOR_REGISTRAR', 'Sensor')
  create(
    @Body() createSensorDto: CreateSensorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.create(createSensorDto, tenant);
  }

  @Get()
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.OPERARIO_LINEA, ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  findAll(
    @Query() query: SensorFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.findAll(query, tenant);
  }

  @Get(':id')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.OPERARIO_LINEA, ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.sensorService.findOne(+id, tenant);
  }

  @Get(':id/historial')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.OPERARIO_LINEA, ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  historialPorSensor(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.sensorService.historialPorSensor(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('SENSOR_ACTUALIZAR', 'Sensor')
  update(
    @Param('id') id: string,
    @Body() updateSensorDto: UpdateSensorDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.sensorService.update(+id, updateSensorDto, tenant);
  }

  // HU-33: asociar uno o más sensores a un lote — Operario de línea.
  @Patch('lote/:loteId/asociar')
  @Roles(ROLES.OPERARIO_LINEA, ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('SENSOR_ASOCIAR_LOTE', 'Sensor')
  asociarALote(
    @Param('loteId') loteId: string,
    @Body() dto: AsociarLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por tu @CurrentUser() real
  ) {
    const usuarioId = req.user.sub;
    return this.sensorService.asociarALote(+loteId, dto.sensorIds, usuarioId, tenant);
  }

  @Delete(':id')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('SENSOR_ELIMINAR', 'Sensor')
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.sensorService.remove(+id, tenant);
  }
}