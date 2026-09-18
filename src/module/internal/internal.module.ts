import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lote } from '../lote/entities/lote.entity';
import { DestinoProductivo } from '../destino-productivo/entities/destino-productivo.entity';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { MlTrainingDataController } from './ml-training-data.controller';
import { MlTrainingDataService } from './ml-training-data.service';

@Module({
  // DestinoProductivo se registra acá también: Lote tiene un ManyToOne hacia
  // esa entidad (ver lote.entity.ts) y ningún otro módulo la carga todavía
  // (no existe destino-productivo.module.ts), así que sin este forFeature
  // TypeORM falla al arrancar con "Entity metadata for Lote#destinoProductivo
  // was not found".
  imports: [TypeOrmModule.forFeature([Lote, DestinoProductivo])],
  controllers: [MlTrainingDataController],
  providers: [MlTrainingDataService, InternalApiKeyGuard],
})
export class InternalModule {}
