
import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { InternalApiKeyGuard } from '../internal/guards/internal-api-key.guard';

import { DatasetMlService } from './dataset-ml.service';
import { SeriesHistoricasQueryDto } from './dto/series-historicas-query.dto';
import { EstabilidadProveedorService } from '../estabilidad-proveedor/estabilidad-proveedor.service';

// Servicio a servicio (microservicio de IA): sin JWT, solo API key por header.
// @Public() saltea JwtAuthGuard y PermissionsGuard globales; el guard de API key
// corre antes que los pipes, así que sin key válida responde 401 siempre.
@ApiTags('internal')
@Public()
@UseGuards(InternalApiKeyGuard)
@Controller('internal/series-historicas')
export class DatasetMlController {
  constructor(
    private readonly datasetMlService: DatasetMlService,
    private readonly estabilidadProveedorService: EstabilidadProveedorService,
  ) {}

  @Get()
  obtenerSerie(
    @Query() query: SeriesHistoricasQueryDto,
  ) {
    return this.datasetMlService.obtenerSerie(
      query.empresaId,
      query.parametro,
      new Date(query.desde),
      new Date(query.hasta),
    );
  }

  @Get('proveedores-lotes')
  obtenerLotesPorProveedor(
    @Query('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.datasetMlService.obtenerLotesPorProveedor(empresaId);
  }

}