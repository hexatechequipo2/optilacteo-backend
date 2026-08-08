import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicionManualLote } from './entities/medicion-manual-lote.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { MedicionManualController } from './medicion-manual.controller';
import { MedicionManualService } from './medicion-manual.service';
import { MedicionManualLoteRepository } from './repository/medicion-manual-lote.repository';
import { MEDICION_MANUAL_LOTE_REPOSITORY } from './repository/medicion-manual-lote.repository.interface';
import { LoteModule } from '../lote/lote.module';
import { SensorModule } from '../sensor/sensor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicionManualLote, ConfiguracionParametro]),
    forwardRef(() => LoteModule),
    forwardRef(() => SensorModule),
  ],
  controllers: [MedicionManualController],
  providers: [
    MedicionManualService,
    {
      provide: MEDICION_MANUAL_LOTE_REPOSITORY,
      useClass: MedicionManualLoteRepository,
    },
  ],
  exports: [MedicionManualService],
})
export class MedicionManualModule {}