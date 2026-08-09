import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Notificacion } from './entities/notificacion.entity';
import { User } from '../user/entities/user.entity';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './gateway/notificaciones.gateway';
import { NotificacionRepository } from './repository/notificacion.repository';
import { NOTIFICACION_REPOSITORY } from './repository/notificacion.repository.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion, User]),
    JwtModule.register({}), // ver nota: borrar si JwtModule ya es @Global()
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesGateway,
    { provide: NOTIFICACION_REPOSITORY, useClass: NotificacionRepository },
  ],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
