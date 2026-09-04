import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lote } from '../lote/entities/lote.entity';
import { User } from '../user/entities/user.entity';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';

import { NOTIFICACION_REPOSITORY } from '../notificaciones/repository/notificacion.repository.interface';
import { NotificacionRepository } from '../notificaciones/repository/notificacion.repository';
import { NotificacionesGateway } from '../notificaciones/gateway/notificaciones.gateway';

import { AnomaliaService } from './anomalia.service';
import { AnomaliaController } from './anomalia.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lote, User, Notificacion])],
  controllers: [AnomaliaController],
  providers: [
    AnomaliaService,
    NotificacionesGateway,
    {
      provide: NOTIFICACION_REPOSITORY,
      useClass: NotificacionRepository,
    },
  ],
})
export class AnomaliaModule {}