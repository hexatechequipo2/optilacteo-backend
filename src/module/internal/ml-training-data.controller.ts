import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { MlTrainingDataService } from './ml-training-data.service';

@Controller('internal/ml-training-data')
export class MlTrainingDataController {
  constructor(
    private readonly mlTrainingDataService: MlTrainingDataService,
  ) {}

  // @Public() es obligatorio acá: auth.module.ts registra JwtAuthGuard como
  // APP_GUARD global, y el microservicio Python no manda JWT. El guard de
  // API key de abajo es la autenticación real de este endpoint.
  @Get('lotes')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  obtenerLotes(@Query('empresa_id', ParseIntPipe) empresaId: number) {
    return this.mlTrainingDataService.obtenerLotesParaEntrenamiento(empresaId);
  }
}
