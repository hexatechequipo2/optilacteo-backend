import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';

import { DatasetMlService } from './dataset-ml.service';
import { DatasetMlController } from './dataset-ml.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SensorLectura, MedicionManualLote])],
  controllers: [DatasetMlController],
  providers: [DatasetMlService],
})
export class DatasetMlModule {}