import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from '../entities/notificacion.entity';
import { INotificacionRepository } from './notificacion.repository.interface';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';

@Injectable()
export class NotificacionRepository implements INotificacionRepository {
  constructor(
    @InjectRepository(Notificacion)
    private readonly repository: Repository<Notificacion>,
  ) {}

  create(notificacion: Partial<Notificacion>): Promise<Notificacion> {
    const entity = this.repository.create(notificacion);
    return this.repository.save(entity);
  }

  findByUsuario(
    usuarioId: number,
    empresaId: number,
    query: NotificacionFilterQueryDto,
  ): Promise<[Notificacion[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.repository.findAndCount({
      where: { usuarioId, empresaId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findById(id: number, empresaId: number): Promise<Notificacion | null> {
    return this.repository.findOne({ where: { id, empresaId } });
  }

  async markAsLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<Notificacion | null> {
    const result = await this.repository.update(
      { id, usuarioId, empresaId },
      { leida: true },
    );
    if (!result.affected) {
      return null;
    }
    return this.repository.findOne({ where: { id, usuarioId, empresaId } });
  }

  countNoLeidas(usuarioId: number, empresaId: number): Promise<number> {
    return this.repository.count({
      where: { usuarioId, empresaId, leida: false },
    });
  }
}
