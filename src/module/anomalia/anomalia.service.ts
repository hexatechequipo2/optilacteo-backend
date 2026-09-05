import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { IAnomaliaClient } from './interfaces/anomalia-client.interface';
import { ANOMALIA_CLIENT } from './interfaces/anomalia-client.interface';

import type { INotificacionRepository } from '../notificaciones/repository/notificacion.repository.interface';
import { NOTIFICACION_REPOSITORY } from '../notificaciones/repository/notificacion.repository.interface';
import { NotificacionMapper } from '../notificaciones/mappers/notificacion.mapper';
import { TipoNotificacion } from '../notificaciones/enums/tipo-notificacion.enum';
import { TipoDesvioAnomalia } from '../notificaciones/enums/tipo-desvio-anomalia.enum';
import { NotificacionesGateway } from '../notificaciones/gateway/notificaciones.gateway';

import { Parametro } from '../config-parametro/enums/parametro.enum';
import { Lote } from '../lote/entities/lote.entity';
import { User } from '../user/entities/user.entity';
import { ROLES } from '../rol/constants/roles.constants';

export interface EvaluarAnomaliaParams {
  empresaId: number;
  loteId: number;
  loteCodigo: string;
  parametro: Parametro;
  valor: number;
  historicoReciente: number[];
}

@Injectable()
export class AnomaliaService {
  private readonly logger = new Logger(AnomaliaService.name);

  constructor(
    @Inject(ANOMALIA_CLIENT)
    private readonly anomaliaClient: IAnomaliaClient,

    @Inject(NOTIFICACION_REPOSITORY)
    private readonly notificacionRepository: INotificacionRepository,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly gateway: NotificacionesGateway,
  ) {}

  /**
   * HU-50:
   * A diferencia del diseño batch original, este servicio LLAMA al
   * microservicio ML de forma sincrónica — se invoca best-effort desde
   * MedicionManualService.registrar() y
   * LecturaSensorService.ingresar()/ingresarManual(), igual que
   * clasificacionLoteService.evaluarYClasificar en HU-21. Nunca debe
   * romper el registro de la medición si falla (el catch queda del lado
   * del caller, este método puede lanzar si el HTTP falla).
   *
   * Aplica el mismo criterio de dedupe que HU-27/HU-31: si ya hay una
   * alerta ABIERTA para el mismo lote+parámetro+tipoDesvio, no genera otra.
   */
  async evaluarAnomalia(params: EvaluarAnomaliaParams): Promise<void> {
    const { empresaId, loteId, loteCodigo, parametro, valor, historicoReciente } =
      params;

    let resultado;
    try {
      resultado = await this.anomaliaClient.detectar({
        empresaId,
        parametro,
        valor,
        historicoReciente,
      });
    } catch (err) {
      this.logger.error(
        `Error al consultar el microservicio ML de anomalías (lote ${loteId}, ` +
          `parámetro ${parametro}): ${err}`,
      );
      return;
    }

    if (resultado.status !== 'ok' || !resultado.esAnomalia) {
      return;
    }

    const tipoDesvio = resultado.tipoDesvio as TipoDesvioAnomalia;

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
      return;
    }

    const lote = await this.loteRepo.findOne({
      where: { id: loteId, empresaId },
    });

    const mensaje =
      `Anomalía detectada: el parámetro ${parametro} del lote ${loteCodigo} ` +
      `presenta un patrón inusual (${tipoDesvio}), confianza del modelo ` +
      `${resultado.confianza}%.`;

    const responsables = await this.obtenerResponsablesProduccion(empresaId);

    const data: Record<string, unknown> = {
      loteId,
      loteCodigo,
      parametro,
      tipoDesvio,
      confianza: resultado.confianza,
      modeloVersion: resultado.modeloVersion,
    };

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
        confianza: resultado.confianza,
        modeloVersion: resultado.modeloVersion,
      });

      const creada = await this.notificacionRepository.create(entity);
      const response = NotificacionMapper.toResponse(creada);

      this.gateway.emitirNotificacion(response, empresaId, usuario.id);
    }
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