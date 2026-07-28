import { Notificacion } from '../entities/notificacion.entity';

export const NOTIFICACION_REPOSITORY = 'NOTIFICACION_REPOSITORY';

export interface INotificacionRepository {
  create(notificacion: Partial<Notificacion>): Promise<Notificacion>;

  findByUsuario(
    usuarioId: number,
    empresaId: number,
  ): Promise<Notificacion[]>;

  findById(
    id: number,
    empresaId: number,
  ): Promise<Notificacion | null>;

  markAsLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<void>;
}