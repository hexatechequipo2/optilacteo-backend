
import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { InternalApiKeyGuard } from '../internal/guards/internal-api-key.guard';

import { EstabilidadProveedorService } from './estabilidad-proveedor.service';

// Servicio a servicio (microservicio de IA): sin JWT, solo API key por header.
// @Public() saltea JwtAuthGuard y PermissionsGuard globales; el guard de API key
// corre antes que los pipes, así que sin key válida responde 401 siempre.
@ApiTags('estabilidad-proveedor')
@Public()
@UseGuards(InternalApiKeyGuard)
@Controller('estabilidad-proveedor')
export class EstabilidadProveedorController {
  constructor(
    private readonly estabilidadProveedorService: EstabilidadProveedorService,
  ) {}

  // Consultar la clasificación previamente guardada
  @Get(':proveedorId')
  obtenerEstabilidadProveedor(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Query('empresaId', ParseIntPipe) empresaId: number,
  ) {
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
  ) {
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