import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { PrediccionVolumen } from './entities/prediccion-volumen.entity';
import { Lote } from '../lote/entities/lote.entity';

import { PREDICCION_VOLUMEN_REPOSITORY } from './repository/prediccion-volumen.repository.interface';
import { PrediccionVolumenRepository } from './repository/prediccion-volumen.repository';

import { PREDICCION_CLIENT } from './interfaces/prediccion-client.interface';
import { PrediccionHttpClient } from './clients/prediccion-http.client';

import { PrediccionVolumenService } from './prediccion-volumen.service';
import { PrediccionVolumenController } from './prediccion-volumen.controller';
import { PrediccionVolumenTask } from './tasks/prediccion-volumen.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrediccionVolumen, Lote]),
    HttpModule,
  ],
  controllers: [PrediccionVolumenController],
  providers: [
    PrediccionVolumenService,
    PrediccionVolumenRepository,
    {
      provide: PREDICCION_VOLUMEN_REPOSITORY,
      useClass: PrediccionVolumenRepository,
    },
    {
      provide: PREDICCION_CLIENT,
      useClass: PrediccionHttpClient,
    },
    PrediccionVolumenTask,
  ],
  exports: [PrediccionVolumenService],
})
export class PrediccionVolumenModule {}