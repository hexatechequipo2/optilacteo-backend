import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionParametro } from './entities/config-parametro.entity';
import { ConfiguracionComparacionHistorica } from './entities/configuracion-comparacion-historica.entity';
import { ConfigParametroController } from './config-parametro.controller';
import { ConfigParametroService } from './config-parametro.service';
import { ConfiguracionComparacionHistoricaService } from './configuracion-comparacion-historica.service';
import { ConfigParametroRepository } from './repository/config-parametro.repository';
import { ConfiguracionComparacionHistoricaRepository } from './repository/configuracion-comparacion-historica.repository';
import { CONFIG_PARAMETRO_REPOSITORY } from './repository/config-parametro.repository.interface';
import { CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY } from './repository/configuracion-comparacion-historica.repository.interface';
import { ConfiguracionComparacionHistoricaController } from './configuracion-comparacion-historica.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfiguracionParametro,
      ConfiguracionComparacionHistorica,
    ]),
  ],
  controllers: [ConfigParametroController, ConfiguracionComparacionHistoricaController],
  providers: [
    ConfigParametroService,
    ConfiguracionComparacionHistoricaService,
    {
      provide: CONFIG_PARAMETRO_REPOSITORY,
      useClass: ConfigParametroRepository,
    },
    {
      provide: CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY,
      useClass: ConfiguracionComparacionHistoricaRepository,
    },
  ],
  exports: [ConfigParametroService, ConfiguracionComparacionHistoricaService],
})
export class ConfigParametroModule {}