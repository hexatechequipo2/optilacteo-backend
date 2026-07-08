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
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';

@ApiTags('system-config')
@ApiBearerAuth()
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('inactivity-timeout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener configuracion de tiempo de inactividad' })
  @ApiResponse({
    status: 200,
    description: 'Configuracion obtenida correctamente',
  })
  getInactivityTimeout() {
    return this.systemConfigService.getConfig();
  }

  @Roles(ROLES.ADMINISTRADOR)
  @Patch('inactivity-timeout')
  @HttpCode(HttpStatus.OK)
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