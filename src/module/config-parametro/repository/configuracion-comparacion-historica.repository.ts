import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionComparacionHistorica } from '../entities/configuracion-comparacion-historica.entity';
import type { IConfiguracionComparacionHistoricaRepository } from './configuracion-comparacion-historica.repository.interface';

@Injectable()
export class ConfiguracionComparacionHistoricaRepository implements IConfiguracionComparacionHistoricaRepository {
  constructor(
    @InjectRepository(ConfiguracionComparacionHistorica)
    private readonly repository: Repository<ConfiguracionComparacionHistorica>,
  ) {}

  findByEmpresa(
    empresaId: number,
  ): Promise<ConfiguracionComparacionHistorica | null> {
    return this.repository.findOne({ where: { empresaId } });
  }

  save(
    entity: ConfiguracionComparacionHistorica,
  ): Promise<ConfiguracionComparacionHistorica> {
    return this.repository.save(entity);
  }

  create(
    data: Partial<ConfiguracionComparacionHistorica>,
  ): ConfiguracionComparacionHistorica {
    return this.repository.create(data);
  }
}
