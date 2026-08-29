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
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { PlcConfigService } from './plc-config.service';
import { UpdatePlcConfigDto } from './dto/update-plc-config.dto';
import { TestConnectionDto } from './dto/test-connection.dto';

@ApiTags('plc-config')
@ApiBearerAuth()
@Controller('plc-config')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE)
export class PlcConfigController {
  constructor(private readonly plcConfigService: PlcConfigService) {}

  @Get()
  @Permissions(ModuloSistema.SENSORES_IOT, 'canRead')
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
  @Permissions(ModuloSistema.SENSORES_IOT, 'canWrite')
  @AuditLog('PLC_CONFIG_ACTUALIZAR', 'PlcConfig')
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
  @Permissions(ModuloSistema.SENSORES_IOT, 'canWrite')
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
