import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SensorLectura } from './entities/sensor-lectura.entity';
import { SensorEvento } from './entities/sensor-evento.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { LecturaSensorController } from './lectura-sensor.controller';
import { LecturaSensorService } from './lectura-sensor.service';
import { SensorLecturaRepository } from './repository/sensor-lectura.repository';
import { SENSOR_LECTURA_REPOSITORY } from './repository/sensor-lectura.repository.interface';
import { SensorEventoRepository } from './repository/sensor-evento.repository';
import { SENSOR_EVENTO_REPOSITORY } from './repository/sensor-evento.repository.interface';
import { SensorInactividadRepository } from './repository/sensor-inactividad.repository';
import { SENSOR_INACTIVIDAD_REPOSITORY } from './repository/sensor-inactividad.repository.interface';
import { SensorInactividadTask } from './tasks/sensor-inactividad.task';
import { SensorModule } from '../sensor/sensor.module';
import { LoteModule } from '../lote/lote.module';
import { AuthModule } from '../auth/auth.module';
import { LecturasGateway } from './gateway/lecturas.gateway';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { AuditLogModule } from '../audit/audit-log.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    // Sensor se registra de nuevo acá (además de en SensorModule) para que
    // SensorInactividadRepository pueda hacer la consulta cross-tenant del
    // cron sin que sensor.module.ts tenga que exportar su Repository crudo.
    TypeOrmModule.forFeature([
      SensorLectura,
      SensorEvento,
      Sensor,
      ConfiguracionParametro,
    ]),
    SensorModule,
    LoteModule,
    NotificacionesModule,
    // Provee JwtService (ya configurado con JWT_SECRET) para que el gateway
    // valide el token del handshake sin duplicar esa configuración.
    AuthModule,
    ScheduleModule.forRoot(),
    AuditLogModule,
  ],
  controllers: [LecturaSensorController],
  providers: [
    LecturaSensorService,
    LecturasGateway,
    SensorInactividadTask,
    { provide: SENSOR_LECTURA_REPOSITORY, useClass: SensorLecturaRepository },
    { provide: SENSOR_EVENTO_REPOSITORY, useClass: SensorEventoRepository },
    {
      provide: SENSOR_INACTIVIDAD_REPOSITORY,
      useClass: SensorInactividadRepository,
    },
  ],
})
export class LecturaSensorModule {}
