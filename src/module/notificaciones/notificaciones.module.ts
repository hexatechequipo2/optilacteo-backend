import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

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

// HU-31
import { Sensor } from '../sensor/entities/sensor.entity';
import { ConfiguracionAlertaDesconexion } from './entities/configuracion-alerta-desconexion.entity';
import { ConfiguracionAlertaDesconexionService } from './configuracion-alerta-desconexion.service';
import { ConfiguracionAlertaDesconexionRepository } from './repository/configuracion-alerta-desconexion.repository';
import { CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY } from './repository/configuracion-alerta-desconexion.repository.interface';
import { SensorDesconexionCronService } from './cron/sensor-desconexion-cron.service';

import { HttpMlClient } from '../ml/infrastructure/http-ml-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacion,
      ConfiguracionNotificacionNivel,
      ConfiguracionAlertaDesconexion, // HU-31
      Sensor, // HU-31
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'defaultSecret',
      signOptions: { expiresIn: '1h' },
    }),
    HttpModule,
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesGateway,
    {
      provide: NOTIFICACION_REPOSITORY,
      useClass: NotificacionRepository,
    },
    {
      provide: CONFIGURACION_NOTIFICACION_REPOSITORY,
      useClass: ConfiguracionNotificacionRepository,
    },
    // HU-31
    ConfiguracionAlertaDesconexionService,
    SensorDesconexionCronService,
    {
      provide: CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY,
      useClass: ConfiguracionAlertaDesconexionRepository,
    },
    HttpMlClient,
  ],
  exports: [NotificacionesService, NotificacionesGateway],
})
export class NotificacionesModule {}
