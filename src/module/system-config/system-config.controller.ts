import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import {
  AuthenticatedOnly,
  Permissions,
} from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';

@ApiTags('system-config')
@ApiBearerAuth()
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('inactivity-timeout')
  @AuthenticatedOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener configuracion de tiempo de inactividad' })
  @ApiResponse({
    status: 200,
    description: 'Configuracion obtenida correctamente',
  })
  getInactivityTimeout() {
    return this.systemConfigService.getConfig();
  }

  @Patch('inactivity-timeout')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  @HttpCode(HttpStatus.OK)
  @AuditLog('SYSTEM_CONFIG_UPDATE', 'SystemConfig', TipoAccion.EDICION)
  @ApiOperation({ summary: 'Actualizar tiempo de inactividad en minutos' })
  @ApiResponse({
    status: 200,
    description: 'Configuracion actualizada correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos invalidos',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para modificar esta configuracion',
  })
  updateInactivityTimeout(@Body() dto: UpdateSystemConfigDto) {
    return this.systemConfigService.updateInactivityTimeout(dto);
  }
}
