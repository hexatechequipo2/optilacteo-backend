
import {
  Controller,
  Get,
  Post,
  Headers,
  Param,
  ParseIntPipe,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DatasetMlService } from './dataset-ml.service';
import { SeriesHistoricasQueryDto } from './dto/series-historicas-query.dto';
import { EstabilidadProveedorService } from '../estabilidad-proveedor/estabilidad-proveedor.service';

@ApiTags('internal')
@Controller('internal/series-historicas')
export class DatasetMlController {
  constructor(
    private readonly datasetMlService: DatasetMlService,
    private readonly estabilidadProveedorService: EstabilidadProveedorService,
  ) {}

  // Validación compartida para los endpoints internos
  private validarApiKey(apiKey: string) {
    if (!apiKey || apiKey !== process.env.NEST_INTERNAL_API_KEY) {
      throw new UnauthorizedException('API key inválida o ausente');
    }
  }

  @Get()
  obtenerSerie(
    @Query() query: SeriesHistoricasQueryDto,
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    this.validarApiKey(apiKey);

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
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    this.validarApiKey(apiKey);

    return this.datasetMlService.obtenerLotesPorProveedor(empresaId);
  }

}