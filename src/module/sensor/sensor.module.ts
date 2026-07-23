import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sensor } from './entities/sensor.entity';
import { SensorLoteHistorial } from './entities/sensor-lote-historial.entity';
import { SensorController } from './sensor.controller';
import { SensorService } from './sensor.service';
import { SensorRepository } from './repository/sensor.repository';
import { SENSOR_REPOSITORY } from './repository/sensor.repository.interface';
import { SensorLoteHistorialRepository } from './repository/sensor-lote-historial.repository';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from './repository/sensor-lote-historial.repository.interface';
import { LoteModule } from '../lote/lote.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, SensorLoteHistorial]),
    forwardRef(() => LoteModule),
  ],
  controllers: [SensorController],
  providers: [
    SensorService,
    { provide: SENSOR_REPOSITORY, useClass: SensorRepository },
    { provide: SENSOR_LOTE_HISTORIAL_REPOSITORY, useClass: SensorLoteHistorialRepository },
  ],
  exports: [SensorService, SENSOR_REPOSITORY, SENSOR_LOTE_HISTORIAL_REPOSITORY],
})
export class SensorModule {}