import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lote } from '../lote/entities/lote.entity';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';

import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

import { ConfigParametroModule } from '../config-parametro/config-parametro.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      Notificacion,
      ConfiguracionParametro,
      SensorLectura,
      MedicionManualLote,
    ]),

    ConfigParametroModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}