
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { DatasetMlService } from './dataset-ml.service';
import { DatasetMlController } from './dataset-ml.controller';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { Lote } from '../lote/entities/lote.entity';
import { EstabilidadProveedorModule } from '../estabilidad-proveedor/estabilidad-proveedor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SensorLectura,
      MedicionManualLote,
      Lote,
      ConfiguracionParametro,
    ]),
    EstabilidadProveedorModule,
  ],
  controllers: [DatasetMlController],
  providers: [DatasetMlService],
})
export class DatasetMlModule {}