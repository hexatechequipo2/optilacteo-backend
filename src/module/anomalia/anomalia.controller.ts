import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AnomaliaService } from './anomalia.service';
import { ReportarAnomaliaDto } from './dto/reportar-anomalia.dto';

// HU-50: lo llama la cuenta de servicio del microservicio ML (cron batch),
// no un usuario con rol de negocio. Sin @Roles()/@Permissions(), mismo
// criterio que LecturaSensorController.ingresar (HU-13).
// TODO: confirmar si existe un guard de cuenta de servicio para reusar acá
// en vez de dejarlo sin guard.
@ApiTags('internal')
@Controller('internal/anomalias')
export class AnomaliaController {
  constructor(private readonly anomaliaService: AnomaliaService) {}

  @Post()
  registrar(@Body() dto: ReportarAnomaliaDto) {
    return this.anomaliaService.registrarAnomalia(dto);
  }
}