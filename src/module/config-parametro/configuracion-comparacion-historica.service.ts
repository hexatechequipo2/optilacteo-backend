import { Inject, Injectable } from '@nestjs/common';
import { CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY } from './repository/configuracion-comparacion-historica.repository.interface';
import type { IConfiguracionComparacionHistoricaRepository } from './repository/configuracion-comparacion-historica.repository.interface';
import { UpdateConfiguracionComparacionHistoricaDto } from './dto/update-configuracion-comparacion-historica.dto';

// Defaults si la empresa nunca configuró nada (HU-23, criterio 4).
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

  async getConfig(
    empresaId: number,
  ): Promise<ConfiguracionComparacionHistoricaDto> {
    const config = await this.repository.findByEmpresa(empresaId);
    if (!config) {
      return {
        desvioSignificativoPorcentaje: DESVIO_SIGNIFICATIVO_DEFAULT,
        cantidadRegistrosHistoricos: CANTIDAD_REGISTROS_HISTORICOS_DEFAULT,
      };
    }
    return {
      desvioSignificativoPorcentaje: Number(
        config.desvioSignificativoPorcentaje,
      ),
      cantidadRegistrosHistoricos: config.cantidadRegistrosHistoricos,
    };
  }

  // HU-23: update-or-create. Si la empresa nunca tuvo fila, la crea con
  // los defaults para los campos no enviados. Si ya existía, conserva el
  // valor anterior de cada campo no enviado.
  async update(
    empresaId: number,
    dto: UpdateConfiguracionComparacionHistoricaDto,
  ): Promise<ConfiguracionComparacionHistoricaDto> {
    let config = await this.repository.findByEmpresa(empresaId);

    if (!config) {
      config = this.repository.create({
        empresaId,
        desvioSignificativoPorcentaje:
          dto.desvioSignificativoPorcentaje ?? DESVIO_SIGNIFICATIVO_DEFAULT,
        cantidadRegistrosHistoricos:
          dto.cantidadRegistrosHistoricos ??
          CANTIDAD_REGISTROS_HISTORICOS_DEFAULT,
      });
    } else {
      if (dto.desvioSignificativoPorcentaje !== undefined) {
        config.desvioSignificativoPorcentaje =
          dto.desvioSignificativoPorcentaje;
      }
      if (dto.cantidadRegistrosHistoricos !== undefined) {
        config.cantidadRegistrosHistoricos = dto.cantidadRegistrosHistoricos;
      }
    }

    const saved = await this.repository.save(config);
    return {
      desvioSignificativoPorcentaje: Number(
        saved.desvioSignificativoPorcentaje,
      ),
      cantidadRegistrosHistoricos: saved.cantidadRegistrosHistoricos,
    };
  }
}
