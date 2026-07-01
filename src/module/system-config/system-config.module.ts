import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { SystemConfigRepository } from './repository/system-config.repository';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from './system-config.controller';
import { SYSTEM_CONFIG_REPOSITORY } from './repository/system-config-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [SystemConfigController],
  providers: [
    SystemConfigService,
    {
      provide: SYSTEM_CONFIG_REPOSITORY,
      useClass: SystemConfigRepository,
    },
  ],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
