import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DatasetMlService } from './dataset-ml.service';
import { SeriesHistoricasQueryDto } from './dto/series-historicas-query.dto';

// HU-50: lo consume la cuenta de servicio del microservicio ML
// (entrenamiento vía data_client.py), no un usuario con rol de negocio.
// Autenticación por API key en header, mismo patrón que ya usa
// data_client.py contra /internal/ml-training-data/lotes (HU-49).
// Sin @CurrentEmpresa(): el microservicio pide datos de la empresa que
// está entrenando puntualmente, por eso empresaId viene explícito por
// query en vez de resolverse del tenant de un usuario logueado.
@ApiTags('internal')
@Controller('internal/series-historicas')
export class DatasetMlController {
  constructor(private readonly datasetMlService: DatasetMlService) {}

  @Get()
  obtenerSerie(
    @Query() query: SeriesHistoricasQueryDto,
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    if (!apiKey || apiKey !== process.env.NEST_INTERNAL_API_KEY) {
      throw new UnauthorizedException('API key inválida o ausente');
    }

    return this.datasetMlService.obtenerSerie(
      query.empresaId,
      query.parametro,
      new Date(query.desde),
      new Date(query.hasta),
    );
  }
}