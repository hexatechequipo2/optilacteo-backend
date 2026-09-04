import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Lote } from '../lote/entities/lote.entity';
import { NotificacionesGateway } from '../notificaciones/gateway/notificaciones.gateway';
import { NotificacionMapper } from '../notificaciones/mappers/notificacion.mapper';
import { NotificacionResponseDto } from '../notificaciones/dto/notificacion-response.dto';
import { TipoNotificacion } from '../notificaciones/enums/tipo-notificacion.enum';

import type { INotificacionRepository } from '../notificaciones/repository/notificacion.repository.interface';
import { NOTIFICACION_REPOSITORY } from '../notificaciones/repository/notificacion.repository.interface';

import { ReportarAnomaliaDto } from './dto/reportar-anomalia.dto';

import { ROLES } from '../rol/constants/roles.constants';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AnomaliaService {
  private readonly logger = new Logger(AnomaliaService.name);

  constructor(
    private readonly notificacionRepository: INotificacionRepository,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly gateway: NotificacionesGateway,
  ) {}

  /**
   * HU-50:
   * Recibe una anomalía detectada por el microservicio ML. Aplica el mismo
   * criterio de dedupe que HU-27/HU-31: si ya hay una alerta abierta para
   * el mismo lote+parámetro+tipoDesvio, no genera otra.
   */
  async registrarAnomalia(
    dto: ReportarAnomaliaDto,
  ): Promise<NotificacionResponseDto[]> {
    const { empresaId, loteId, parametro, tipoDesvio, confianza, modeloVersion } =
      dto;

    const lote = await this.loteRepo.findOne({
      where: { id: loteId, empresaId },
    });

    if (!lote) {
      throw new NotFoundException(
        `Lote ${loteId} no encontrado en la empresa ${empresaId}`,
      );
    }

    const alertaAbiertaExistente =
      await this.notificacionRepository.findAlertaAbiertaAnomalia(
        empresaId,
        loteId,
        parametro,
        tipoDesvio,
      );

    if (alertaAbiertaExistente) {
      this.logger.log(
        `Anomalía duplicada ignorada: lote ${loteId}, parámetro ${parametro}, ` +
          `tipo ${tipoDesvio} ya tiene una alerta abierta.`,
      );

      return [];
    }

    // HU-50 criterio 3: se distingue visualmente de la alerta de umbral por
    // el campo `tipo` (ALERTA_ANOMALIA) que ya consume el frontend/historial.
    const mensaje =
      `Anomalía detectada: el parámetro ${parametro} del lote ${lote.codigo} ` +
      `presenta un patrón inusual (${tipoDesvio}), confianza del modelo ` +
      `${confianza}%.`;

    const responsables = await this.obtenerResponsablesProduccion(empresaId);

    const data: Record<string, unknown> = {
      loteId,
      loteCodigo: lote.codigo,
      parametro,
      tipoDesvio,
      confianza,
      modeloVersion,
      detalle: dto.detalle ?? null,
    };

    const notificaciones: NotificacionResponseDto[] = [];

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo: TipoNotificacion.ALERTA_ANOMALIA,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
        loteId,
        parametro,
        tipoDesvio,
        confianza,
        modeloVersion,
      });

      const creada = await this.notificacionRepository.create(entity);
      const response = NotificacionMapper.toResponse(creada);

      this.gateway.emitirNotificacion(response, empresaId, usuario.id);
      notificaciones.push(response);
    }

    return notificaciones;
  }

  // TODO: confirmar si HU-50 quiere que las anomalías vayan al mismo
  // circuito de destinatarios configurables de HU-26/HU-29
  // (obtenerDestinatariosPorNivel en NotificacionesService), en cuyo caso
  // este método se elimina y se inyecta esa lógica en su lugar.
  private obtenerResponsablesProduccion(empresaId: number): Promise<User[]> {
    return this.userRepo.find({
      where: {
        empresa: { id: empresaId },
        rol: { nombre: ROLES.RESPONSABLE_PRODUCCION },
        isActive: true,
      },
      relations: { rol: true, empresa: true },
    });
  }
}