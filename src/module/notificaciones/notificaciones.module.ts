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
import { ConfiguracionNotificacionNivel } from './entities/configuracion-notificacion-nivel.entity';
import { CONFIGURACION_NOTIFICACION_REPOSITORY } from './repository/configuracion-notificacion-nivel.repository.interface';
import { ConfiguracionNotificacionRepository } from './repository/configuracion-notificacion-nivel.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion, ConfiguracionNotificacionNivel, User]),
    JwtModule.register({}), // ver nota: borrar si JwtModule ya es @Global()
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesGateway,
    { provide: NOTIFICACION_REPOSITORY, useClass: NotificacionRepository },
    {
      provide: CONFIGURACION_NOTIFICACION_REPOSITORY,
      useClass: ConfiguracionNotificacionRepository,
    },
  ],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
