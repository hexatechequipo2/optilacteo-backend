import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionSilencioAlerta } from '../entities/configuracion-silencio-alerta.entity';
import { IConfiguracionSilencioRepository } from './configuracion-silencio-alerta.repository.interface';

@Injectable()
export class ConfiguracionSilencioRepository
  implements IConfiguracionSilencioRepository
{
  constructor(
    @InjectRepository(ConfiguracionSilencioAlerta)
    private readonly repository: Repository<ConfiguracionSilencioAlerta>,
  ) {}

  findByEmpresa(empresaId: number): Promise<ConfiguracionSilencioAlerta[]> {
    return this.repository.find({
      where: { empresaId },
      order: { horaInicio: 'ASC' },
    });
  }

  findById(
    id: number,
    empresaId: number,
  ): Promise<ConfiguracionSilencioAlerta | null> {
    return this.repository.findOne({ where: { id, empresaId } });
  }

  create(
    data: Partial<ConfiguracionSilencioAlerta>,
  ): Promise<ConfiguracionSilencioAlerta> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: number,
    empresaId: number,
    data: Partial<ConfiguracionSilencioAlerta>,
  ): Promise<ConfiguracionSilencioAlerta | null> {
    const existente = await this.findById(id, empresaId);

    if (!existente) {
      return null;
    }

    Object.assign(existente, data);

    return this.repository.save(existente);
  }

  async delete(id: number, empresaId: number): Promise<boolean> {
    const result = await this.repository.delete({ id, empresaId });
    return !!result.affected;
  }
}