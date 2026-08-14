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
      relations: { rol: true, usuario: true },
      order: { nivelAlerta: 'ASC' },
    });
  }

  findById(
    id: number,
    empresaId: number,
  ): Promise<ConfiguracionNotificacionNivel | null> {
    return this.repository.findOne({ where: { id, empresaId } });
  }

  async findDestinatariosConfigByNivel(
    empresaId: number,
    nivelAlerta: NivelAlerta,
  ): Promise<{ rolIds: number[]; usuarioIds: number[] }> {
    const rows = await this.repository.find({
      where: { empresaId, nivelAlerta },
    });

    return {
      rolIds: rows
        .filter((r) => r.rolId != null)
        .map((r) => r.rolId as number),
      usuarioIds: rows
        .filter((r) => r.usuarioId != null)
        .map((r) => r.usuarioId as number),
    };
  }

  countByNivel(empresaId: number, nivelAlerta: NivelAlerta): Promise<number> {
    return this.repository.count({ where: { empresaId, nivelAlerta } });
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