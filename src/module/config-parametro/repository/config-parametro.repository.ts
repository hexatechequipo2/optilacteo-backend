import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionParametro } from '../entities/config-parametro.entity';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { IConfigParametroRepository } from './config-parametro.repository.interface';

@Injectable()
export class ConfigParametroRepository
  implements IConfigParametroRepository
{
  constructor(
    @InjectRepository(ConfiguracionParametro)
    private readonly repository: Repository<ConfiguracionParametro>,
  ) {}

  save(
    config: ConfiguracionParametro,
  ): Promise<ConfiguracionParametro> {
    return this.repository.save(config);
  }

  findById(
    id: number,
  ): Promise<ConfiguracionParametro | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  findByEmpresa(
    empresaId: number,
  ): Promise<ConfiguracionParametro[]> {
    return this.repository.find({
      where: { empresaId },
    });
  }

  findByParametroAndTipoMateriaPrima(
    empresaId: number,
    parametro: Parametro,
    tipoMateriaPrima: TipoMateriaPrima,
  ): Promise<ConfiguracionParametro | null> {
    return this.repository.findOne({
      where: {
        empresaId,
        parametro,
        tipoMateriaPrima,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}