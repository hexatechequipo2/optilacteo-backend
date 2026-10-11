import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { PlcConfigService } from './plc-config.service';
import { UpdatePlcConfigDto } from './dto/update-plc-config.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('plc-config')
@ApiBearerAuth()
@Controller('plc-config')
export class PlcConfigController {
  constructor(private readonly plcConfigService: PlcConfigService) {}

  @Get()
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.READ)
  @ApiOperation({
    summary: 'Obtener configuración de URL del PLC de la empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración obtenida correctamente',
  })
  obtenerConfig(@CurrentEmpresa() tenant: TenantContext) {
    return this.plcConfigService.obtenerConfig(tenant);
  }

  @Put()
  // C y no U: guardarUrl es un upsert (crea la config si la empresa no tiene).
  // Además deja afuera al Operario, que tiene sensores_iot:U para asociar sensores (HU-33).
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.CREATE)
  @AuditLog('PLC_CONFIG_ACTUALIZAR', 'PlcConfig', TipoAccion.EDICION)
  @ApiOperation({ summary: 'Guardar/actualizar la URL del PLC de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada correctamente',
  })
  @ApiResponse({ status: 400, description: 'URL con formato inválido' })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para modificar esta configuración',
  })
  guardarUrl(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: UpdatePlcConfigDto,
  ) {
    return this.plcConfigService.guardarUrl(dto, tenant);
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  // Mismo permiso que el PUT al que precede (upsert → C).
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.CREATE)
  @ApiOperation({
    summary: 'Probar conexión con una URL de PLC antes de guardarla',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado del test (ok true/false)',
  })
  @ApiResponse({ status: 400, description: 'URL con formato inválido' })
  testConexion(@Body() dto: TestConnectionDto) {
    return this.plcConfigService.testConexion(dto);
  }
}
