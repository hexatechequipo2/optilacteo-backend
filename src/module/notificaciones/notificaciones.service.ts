import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { ROLES } from '../rol/constants/roles.constants';

import { NotificacionesGateway } from './gateway/notificaciones.gateway';

import { TipoNotificacion } from './enums/tipo-notificacion.enum';
import { NivelAlerta } from './enums/nivel-alerta.enum';

import { NotificacionResponseDto } from './dto/notificacion-response.dto';
import { NotificacionFilterQueryDto } from './dto/notificacion-filter-query.dto';
import { NotificacionPaginadaResponseDto } from './dto/notificacion-paginada-response.dto';

import {
  NotificacionMapper,
  CrearNotificacionParams,
} from './mappers/notificacion.mapper';

import type { INotificacionRepository } from './repository/notificacion.repository.interface';
import { NOTIFICACION_REPOSITORY } from './repository/notificacion.repository.interface';
import { TipoMateriaPrima } from '../config-parametro/enums/tipo-materia-prima-enum';

@Injectable()
export class NotificacionesService {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY)
    private readonly notificacionRepository: INotificacionRepository,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly gateway: NotificacionesGateway,
  ) {}

  async notificarResponsablesCalidad(
    empresaId: number,
    tipo: TipoNotificacion,
    mensaje: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const responsables = await this.userRepository.find({
      where: {
        empresa: {
          id: empresaId,
        },
        rol: {
          nombre: ROLES.RESPONSABLE_CALIDAD,
        },
        isActive: true,
      },
      relations: {
        rol: true,
        empresa: true,
      },
    });

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
      });

      const creada =
        await this.notificacionRepository.create(entity);

      this.gateway.emitirNotificacion(
        NotificacionMapper.toResponse(creada),
        empresaId,
        usuario.id,
      );
    }
  }

  async generarAlertaPorUmbral(params: {
    empresaId: number;
    loteId: number;
    loteCodigo: string;
    parametro: string;
    materiaPrima: TipoMateriaPrima;
    valor: number;
    umbralMin: number;
    umbralMax: number;
    timestamp?: Date;
  }): Promise<NotificacionResponseDto[]> {
    const {
      empresaId,
      loteId,
      loteCodigo,
      parametro,
      materiaPrima,
      valor,
      umbralMin,
      umbralMax,
      timestamp,
    } = params;

    const fueraDeRango =
      valor < umbralMin ||
      valor > umbralMax;

    if (!fueraDeRango) {
      return [];
    }

    const desvioPorcentaje = this.calcularDesvioPorcentaje(
      valor,
      umbralMin,
      umbralMax,
    );

    const nivelAlerta =
      this.determinarNivelAlerta(desvioPorcentaje);

    const responsables =
      await this.obtenerResponsablesProduccion(empresaId);

    const mensaje = this.construirMensajeAlerta({
      parametro,
      valor,
      umbralMin,
      umbralMax,
      loteCodigo,
      nivelAlerta,
    });

    const data: Record<string, unknown> = {
      loteId,
      loteCodigo,
      parametro,
      materiaPrima,
      valor,
      umbralMin,
      umbralMax,
      desvioPorcentaje,
      nivelAlerta,
      timestamp: (timestamp ?? new Date()).toISOString(),
    };

    const notificaciones: NotificacionResponseDto[] = [];

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
        nivelAlerta,
      });

      const creada =
        await this.notificacionRepository.create(entity);

      const response =
        NotificacionMapper.toResponse(creada);

      this.gateway.emitirNotificacion(
        response,
        empresaId,
        usuario.id,
      );

      notificaciones.push(response);
    }

    return notificaciones;
  }

  private async obtenerResponsablesProduccion(
    empresaId: number,
  ): Promise<User[]> {
    return this.userRepository.find({
      where: {
        empresa: {
          id: empresaId,
        },
        rol: {
          nombre: ROLES.RESPONSABLE_PRODUCCION,
        },
        isActive: true,
      },
      relations: {
        rol: true,
        empresa: true,
      },
    });
  }

  private calcularDesvioPorcentaje(
    valor: number,
    umbralMin: number,
    umbralMax: number,
  ): number {
    if (valor < umbralMin) {
      if (umbralMin === 0) {
        return 100;
      }

      return (
        ((umbralMin - valor) / Math.abs(umbralMin)) *
        100
      );
    }

    if (valor > umbralMax) {
      if (umbralMax === 0) {
        return 100;
      }

      return (
        ((valor - umbralMax) / Math.abs(umbralMax)) *
        100
      );
    }

    return 0;
  }

  private determinarNivelAlerta(
    desvioPorcentaje: number,
  ): NivelAlerta {
    if (desvioPorcentaje <= 5) {
      return NivelAlerta.INFORMATIVA;
    }

    if (desvioPorcentaje < 15) {
      return NivelAlerta.ADVERTENCIA;
    }

    return NivelAlerta.CRITICA;
  }

  private construirMensajeAlerta(params: {
    parametro: string;
    valor: number;
    umbralMin: number;
    umbralMax: number;
    loteCodigo: string;
    nivelAlerta: NivelAlerta;
  }): string {
    const {
      parametro,
      valor,
      umbralMin,
      umbralMax,
      loteCodigo,
      nivelAlerta,
    } = params;

    return (
      `Alerta ${nivelAlerta}: el parámetro ${parametro} ` +
      `del lote ${loteCodigo} registró un valor de ${valor}, ` +
      `fuera del umbral permitido ` +
      `(${umbralMin} - ${umbralMax}).`
    );
  }

  async listarPorUsuario(
    usuarioId: number,
    empresaId: number,
    query: NotificacionFilterQueryDto,
  ): Promise<NotificacionPaginadaResponseDto> {
    const [notificaciones, total] =
      await this.notificacionRepository.findByUsuario(
        usuarioId,
        empresaId,
        query,
      );

    return NotificacionMapper.toPaginatedResponse(
      notificaciones,
      total,
      query,
    );
  }

  async marcarLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<NotificacionResponseDto> {
    const actualizada =
      await this.notificacionRepository.markAsLeida(
        id,
        usuarioId,
        empresaId,
      );

    if (!actualizada) {
      throw new NotFoundException(
        `Notificación ${id} no encontrada`,
      );
    }

    return NotificacionMapper.toResponse(actualizada);
  }
}