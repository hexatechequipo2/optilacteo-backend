import { Inject, Injectable } from '@nestjs/common';
import { CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY } from './repository/configuracion-comparacion-historica.repository.interface';
import type { IConfiguracionComparacionHistoricaRepository } from './repository/configuracion-comparacion-historica.repository.interface';

// Defaults si la empresa nunca configuró nada (criterios 4/8 de HU-24).
export const DESVIO_SIGNIFICATIVO_DEFAULT = 15;
export const CANTIDAD_REGISTROS_HISTORICOS_DEFAULT = 20;

export interface ConfiguracionComparacionHistoricaDto {
  desvioSignificativoPorcentaje: number;
  cantidadRegistrosHistoricos: number;
}

@Injectable()
export class ConfiguracionComparacionHistoricaService {
  constructor(
    @Inject(CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY)
    private readonly repository: IConfiguracionComparacionHistoricaRepository,
  ) {}

  async getConfig(empresaId: number): Promise<ConfiguracionComparacionHistoricaDto> {
    const config = await this.repository.findByEmpresa(empresaId);
    if (!config) {
      return {
        desvioSignificativoPorcentaje: DESVIO_SIGNIFICATIVO_DEFAULT,
        cantidadRegistrosHistoricos: CANTIDAD_REGISTROS_HISTORICOS_DEFAULT,
      };
    }
    return {
      desvioSignificativoPorcentaje: Number(config.desvioSignificativoPorcentaje),
      cantidadRegistrosHistoricos: config.cantidadRegistrosHistoricos,
    };
  }
}