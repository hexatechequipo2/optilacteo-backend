// sensor/plc-config/plc-config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlcConfig } from './entities/plc-config.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { PlcConfigService } from './plc-config.service';
import { PlcConfigController } from './plc-config.controller';
import { PlcConfigRepository } from './repository/plc-config.repository';
import { PLC_CONFIG_REPOSITORY } from './repository/plc-config-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([PlcConfig, Sensor])],
  controllers: [PlcConfigController],
  providers: [
    PlcConfigService,
    { provide: PLC_CONFIG_REPOSITORY, useClass: PlcConfigRepository },
  ],
  exports: [PlcConfigService],
})
export class PlcConfigModule {}
