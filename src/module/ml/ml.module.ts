import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlController } from './ml.controller';
import { MlService } from './ml.service';
import { HttpMlClient } from './infrastructure/http-ml-client';
import { ML_CLIENT } from './interfaces/ml-client.interface';
import { RecomendacionDestino } from './entities/recomendacion-destino.entity';
import { DestinoProductivo } from '../destino-productivo/entities/destino-productivo.entity';
import { Empresa } from '../empresa/entities/empresa.entity';
import { MlReentrenamientoCronService } from './cron/ml-reentrenamiento-cron.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 3000, maxRedirects: 0 }),
    TypeOrmModule.forFeature([RecomendacionDestino, DestinoProductivo, Empresa]),
  ],
  controllers: [MlController],
  providers: [
    MlService,
    MlReentrenamientoCronService,
    {
      provide: ML_CLIENT,
      useClass: HttpMlClient,
    },
  ],
  exports: [MlService],
})
export class MlModule {}
