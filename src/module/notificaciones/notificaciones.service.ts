import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ROLES } from '../rol/constants/roles.constants';
import { NotificacionesGateway } from './gateway/notificaciones.gateway';
import { TipoNotificacion } from './enums/tipo-notificacion.enum';
import { NotificacionResponseDto } from './dto/notificacion-response.dto';
import { NotificacionFilterQueryDto } from './dto/notificacion-filter-query.dto';
import { NotificacionPaginadaResponseDto } from './dto/notificacion-paginada-response.dto';
import { NotificacionMapper } from './mappers/notificacion.mapper';
import type { INotificacionRepository } from './repository/notificacion.repository.interface';
import { NOTIFICACION_REPOSITORY } from './repository/notificacion.repository.interface';

@Injectable()
export class NotificacionesService {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY)
    private readonly notificacionRepository: INotificacionRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gateway: NotificacionesGateway,
  ) {}

  // HU-21 (AC4): notifica a todos los usuarios con rol Responsable de
  // Calidad de la empresa. Una fila por usuario + emisión WS.
  async notificarResponsablesCalidad(
    empresaId: number,
    tipo: TipoNotificacion,
    mensaje: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const responsables = await this.userRepository.find({
      where: {
        empresa: { id: empresaId },
        rol: { nombre: ROLES.RESPONSABLE_CALIDAD },
        isActive: true,
      },
      relations: { rol: true, empresa: true },
    });

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
      });
      const creada = await this.notificacionRepository.create(entity);
      this.gateway.emitirNotificacion(
        NotificacionMapper.toResponse(creada),
        empresaId,
        usuario.id,
      );
    }
  }

  // Paginado (page/limit vía NotificacionFilterQueryDto), más reciente
  // primero. Antes devolvía el listado completo sin paginar.
  async listarPorUsuario(
    usuarioId: number,
    empresaId: number,
    query: NotificacionFilterQueryDto,
  ): Promise<NotificacionPaginadaResponseDto> {
    const [notificaciones, total] = await this.notificacionRepository.findByUsuario(
      usuarioId,
      empresaId,
      query,
    );
    return NotificacionMapper.toPaginatedResponse(notificaciones, total, query);
  }

  async marcarLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<NotificacionResponseDto> {
    const actualizada = await this.notificacionRepository.markAsLeida(id, usuarioId, empresaId);
    if (!actualizada) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }
    return NotificacionMapper.toResponse(actualizada);
  }
}