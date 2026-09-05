import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { Lote } from '../lote/entities/lote.entity';
import { User } from '../user/entities/user.entity';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';

import { NOTIFICACION_REPOSITORY } from '../notificaciones/repository/notificacion.repository.interface';
import { NotificacionRepository } from '../notificaciones/repository/notificacion.repository';

import { NotificacionesModule } from '../notificaciones/notificaciones.module';

import { ANOMALIA_CLIENT } from './interfaces/anomalia-client.interface';
import { AnomaliaHttpClient } from './clients/anomalia-http.client';
import { AnomaliaService } from './anomalia.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lote, User, Notificacion]),
    HttpModule,
    NotificacionesModule,
  ],

  providers: [
    AnomaliaService,

    {
      provide: NOTIFICACION_REPOSITORY,
      useClass: NotificacionRepository,
    },

    {
      provide: ANOMALIA_CLIENT,
      useClass: AnomaliaHttpClient,
    },
  ],

  exports: [AnomaliaService],
})
export class AnomaliaModule {}