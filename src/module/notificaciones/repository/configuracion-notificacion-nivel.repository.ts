import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { IConfiguracionNotificacionRepository } from './configuracion-notificacion-nivel.repository.interface';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

@Injectable()
export class ConfiguracionNotificacionRepository
  implements IConfiguracionNotificacionRepository
{
  constructor(
    @InjectRepository(ConfiguracionNotificacionNivel)
    private readonly repository: Repository<ConfiguracionNotificacionNivel>,
  ) {}

  findByEmpresa(empresaId: number): Promise<ConfiguracionNotificacionNivel[]> {
    return this.repository.find({
      where: { empresaId },
      relations: { rol: true },
      order: { nivelAlerta: 'ASC' },
    });
  }

  async findRolIdsByNivel(
    empresaId: number,
    nivelAlerta: NivelAlerta,
  ): Promise<number[]> {
    const rows = await this.repository.find({
      where: { empresaId, nivelAlerta },
    });
    return rows.map((r) => r.rolId);
  }

  create(
    config: Partial<ConfiguracionNotificacionNivel>,
  ): Promise<ConfiguracionNotificacionNivel> {
    const entity = this.repository.create(config);
    return this.repository.save(entity);
  }

  async delete(id: number, empresaId: number): Promise<boolean> {
    const result = await this.repository.delete({ id, empresaId });
    return !!result.affected;
  }
}