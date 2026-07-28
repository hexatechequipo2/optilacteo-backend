import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from '../entities/notificacion.entity';
import { INotificacionRepository } from './notificacion.repository.interface';

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

  findByUsuario(usuarioId: number, empresaId: number): Promise<Notificacion[]> {
    return this.repository.find({
      where: { usuarioId, empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: number, empresaId: number): Promise<Notificacion | null> {
    return this.repository.findOne({ where: { id, empresaId } });
  }

  async markAsLeida(id: number, usuarioId: number, empresaId: number): Promise<void> {
    await this.repository.update({ id, usuarioId, empresaId }, { leida: true });
  }
}