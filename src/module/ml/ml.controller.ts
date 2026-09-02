import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { MlService } from './ml.service';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';
// Ajustar a los decorators reales del proyecto
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Permissions } from '../auth/decorators/permissions.decorator';
// import { CurrentEmpresa } from '../common/decorators/current-empresa.decorator';

@Controller('recomendaciones')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  // TEMPORAL — solo para probar la conexión NestJS -> Python. Borrar
  // una vez confirmado, y una vez que generarRecomendacion() esté
  // enganchado al flujo real de registro de parámetros del lote.
  @Get('test-conexion')
  testConexion() {
    return this.mlService.testConexion();
  }

  // @Roles('responsable_produccion', 'admin')
  // @Permissions('ver_recomendaciones')
  @Patch(':id/responder')
  responder(
    @Param('id') id: number,
    @Body() dto: ResponderRecomendacionDto,
  ) {
    return this.mlService.responderRecomendacion(id, dto);
  }

  // @Roles('responsable_produccion', 'admin')
  @Get('historial')
  historial(/* @CurrentEmpresa() empresa: Empresa */) {
    // reemplazar por empresa.id una vez cableado el decorator multi-tenant
    const empresaIdMock = 1;
    return this.mlService.historialAciertos(empresaIdMock);
  }
}