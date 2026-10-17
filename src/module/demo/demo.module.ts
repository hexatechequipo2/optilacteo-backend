import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { RecomendacionDestino } from '../ml/entities/recomendacion-destino.entity';
import { Lote } from '../lote/entities/lote.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { LecturaSensorModule } from '../lectura-sensor/lectura-sensor.module';
import { LoteModule } from '../lote/lote.module';
import { SensorModule } from '../sensor/sensor.module';
import { MlModule } from '../ml/ml.module';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoRepository } from './repository/demo.repository';
import { DEMO_REPOSITORY } from './repository/demo.repository.interface';

// Demo en vivo (ver README.md de esta carpeta). Los guards de throttling
// usan la configuración de ThrottlerModule.forRoot() de AuthModule
// (ThrottlerModule es global); los límites propios van por @Throttle.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SensorLectura,
      Notificacion,
      ConfiguracionParametro,
      RecomendacionDestino,
      Lote,
      Sensor,
    ]),
    LecturaSensorModule,
    LoteModule,
    SensorModule,
    MlModule,
  ],
  controllers: [DemoController],
  providers: [
    DemoService,
    { provide: DEMO_REPOSITORY, useClass: DemoRepository },
  ],
})
export class DemoModule {}
