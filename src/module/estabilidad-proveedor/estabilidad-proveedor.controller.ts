
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

import { EstabilidadProveedorService } from './estabilidad-proveedor.service';

@ApiTags('estabilidad-proveedor')
@Controller('estabilidad-proveedor')
export class EstabilidadProveedorController {
  constructor(
    private readonly estabilidadProveedorService: EstabilidadProveedorService,
  ) {}

  private validarApiKey(apiKey: string) {
    if (!apiKey || apiKey !== process.env.NEST_INTERNAL_API_KEY) {
      throw new UnauthorizedException('API key inválida o ausente');
    }
  }

  // Consultar la clasificación previamente guardada
  @Get(':proveedorId')
  obtenerEstabilidadProveedor(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Query('empresaId', ParseIntPipe) empresaId: number,
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    this.validarApiKey(apiKey);

    return this.estabilidadProveedorService.obtener(
      proveedorId,
      empresaId,
    );
  }

  // Recalcular y guardar la clasificación
  @Post(':proveedorId/recalcular')
  async recalcularEstabilidadProveedor(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Query('empresaId', ParseIntPipe) empresaId: number,
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    this.validarApiKey(apiKey);

    await this.estabilidadProveedorService.recalcular(
      proveedorId,
      empresaId,
    );

    return {
      mensaje: 'Recálculo de estabilidad ejecutado',
      proveedorId,
      empresaId,
    };
  }
}