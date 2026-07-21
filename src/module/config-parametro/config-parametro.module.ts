import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionParametro } from './entities/config-parametro.entity';
import { ConfigParametroController } from './config-parametro.controller';
import { ConfigParametroService } from './config-parametro.service';
import { ConfigParametroRepository } from './repository/config-parametro.repository';
import { CONFIG_PARAMETRO_REPOSITORY } from './repository/config-parametro.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionParametro])],
  controllers: [ConfigParametroController],
  providers: [
    ConfigParametroService,
    {
      provide: CONFIG_PARAMETRO_REPOSITORY,
      useClass: ConfigParametroRepository,
    },
  ],
  exports: [ConfigParametroService],
})
export class ConfigParametroModule {}