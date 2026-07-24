import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { LecturaSensorService } from './lectura-sensor.service';
import { IngresarLecturaDto } from './dto/ingresar-lectura.dto';

@ApiTags('lectura-sensor')
@ApiBearerAuth()
@Controller('sensores')
export class LecturaSensorController {
  constructor(private readonly lecturaSensorService: LecturaSensorService) {}

  // HU-13: ingesta de lecturas IoT vía API de PLC. Sin @Roles(): lo llama una
  // cuenta de servicio autenticada (simulador/PLC), no un usuario con un rol
  // de negocio específico.
  @Post('lecturas')
  ingresar(
    @Body() dto: IngresarLecturaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.lecturaSensorService.ingresar(dto, tenant);
  }
}
