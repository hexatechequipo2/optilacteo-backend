import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DatasetMlService } from './dataset-ml.service';
import { SeriesHistoricasQueryDto } from './dto/series-historicas-query.dto';

// HU-50: lo consume la cuenta de servicio del microservicio ML (cron
// batch), no un usuario con rol de negocio. Sin @Roles()/@Permissions(),
// mismo criterio que LecturaSensorController.ingresar (HU-13).
// Sin @CurrentEmpresa(): el cron corre para todas las empresas, por eso
// empresaId viene explícito por query en vez de resolverse del tenant
// del usuario logueado.
// TODO: confirmar si existe (o hay que crear) un guard de cuenta de
// servicio, para reusarlo acá y en AnomaliaController en vez de dejarlos
// sin ningún guard.
@ApiTags('internal')
@Controller('internal/series-historicas')
export class DatasetMlController {
  constructor(private readonly datasetMlService: DatasetMlService) {}

  @Get()
  obtenerSerie(@Query() query: SeriesHistoricasQueryDto) {
    return this.datasetMlService.obtenerSerie(
      query.empresaId,
      query.parametro,
      new Date(query.desde),
      new Date(query.hasta),
    );
  }
}