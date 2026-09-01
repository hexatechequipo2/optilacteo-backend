import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlController } from './ml.controller';
import { MlService } from './ml.service';
import { HttpMlClient } from './infrastructure/http-ml-client';
import { ML_CLIENT } from './interfaces/ml-client.interface';
import { RecomendacionDestino } from './entities/recomendacion-destino.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([RecomendacionDestino]),
  ],
  controllers: [MlController],
  providers: [
    MlService,
    {
      provide: ML_CLIENT,
      useClass: HttpMlClient,
    },
  ],
  exports: [MlService],
})
export class MlModule {}
