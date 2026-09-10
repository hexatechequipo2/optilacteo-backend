import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, IsNull, Not, Repository } from 'typeorm';

import { RecomendacionDestino } from './entities/recomendacion-destino.entity';
import type { IMlClient } from './interfaces/ml-client.interface';
import { ML_CLIENT } from './interfaces/ml-client.interface';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';
import { RecomendacionPendienteResponseDto } from './dto/recomendacion-pendiente-response.dto';
import { RecomendacionMapper } from './mappers/recomendacion.mapper';

import { Parametro } from '../config-parametro/enums/parametro.enum';
import { DestinoProductivo } from '../destino-productivo/entities/destino-productivo.entity';
import { Lote } from '../lote/entities/lote.entity';

import type { TenantContext } from '../../common/types/tenant-context.type';
import { LoteDestinoHistorial } from '../lote/entities/lote-destino-historial.entity';

export interface GenerarRecomendacionParams {
  empresaId: number;
  loteId: number;
  loteConsumoId?: number;
  parametros: { parametro: Parametro; valor: number }[];
}

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);

  constructor(
    @Inject(ML_CLIENT) private readonly mlClient: IMlClient,

    @InjectRepository(RecomendacionDestino)
    private readonly recomendacionRepo: Repository<RecomendacionDestino>,

    @InjectRepository(DestinoProductivo)
    private readonly destinoProductivoRepo: Repository<DestinoProductivo>,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,

    @InjectRepository(LoteDestinoHistorial)
    private readonly loteDestinoHistorialRepo: Repository<LoteDestinoHistorial>,
  ) {}

  private extraerFeatures(
    parametros: { parametro: Parametro; valor: number }[],
  ): Partial<Record<Parametro, number>> {
    const features: Partial<Record<Parametro, number>> = {};

    for (const p of parametros) {
      features[p.parametro] = Number(p.valor);
    }

    return features;
  }

  async generarRecomendacion(
    params: GenerarRecomendacionParams,
  ): Promise<RecomendacionDestino | null> {
    const { empresaId, loteId, loteConsumoId, parametros } = params;

    if (!parametros || parametros.length === 0) {
      throw new UnprocessableEntityException(
        'No hay parámetros registrados para generar una recomendación.',
      );
    }

    const features = this.extraerFeatures(parametros);

    const resultado = await this.mlClient.predecirDestino({
      empresaId,
      parametros: features,
    });

    if (resultado.status === 'insufficient_data') {
      this.logger.log(
        `No hay suficiente historial todavía para recomendar destino (empresa ${empresaId}).`,
      );

      return null;
    }

    const destinoRecomendado = await this.destinoProductivoRepo.findOne({
      where: {
        empresaId,
        nombre: resultado.destinoRecomendado,
      },
    });

    if (!destinoRecomendado) {
      this.logger.warn(
        `El microservicio ML recomendó un destino ("${resultado.destinoRecomendado}") que no existe en el catálogo de destinos productivos de la empresa ${empresaId}.`,
      );

      return null;
    }

    const recomendacion = this.recomendacionRepo.create({
      lote: { id: loteId },
      empresa: { id: empresaId },
      loteConsumo: loteConsumoId
        ? { id: loteConsumoId }
        : null,
      destinoRecomendado,
      confianza: resultado.confianza,
    } as DeepPartial<RecomendacionDestino>);

    return this.recomendacionRepo.save(recomendacion);
  }

    async responderRecomendacion(
    id: number,
    dto: ResponderRecomendacionDto,
    tenant: TenantContext,
    usuarioId: number, // <-- NUEVO (HU-37): quién tomó la decisión
  ): Promise<RecomendacionDestino> {
    const recomendacion = await this.recomendacionRepo.findOne({
      where: {
        id,
        empresa: {
          id: tenant.empresaId!,
        },
      },
      relations: {
        lote: true,
      },
    });

    if (!recomendacion) {
      throw new NotFoundException(
        `Recomendación ${id} no encontrada`,
      );
    }

    // HU-37 AC7: una recomendación ya respondida no puede volver a
    // modificarse (evita reescribir destino/justificación registrados).
    if (recomendacion.estado !== 'pendiente') {
      throw new ConflictException(
        `La recomendación ${id} ya fue respondida y no puede modificarse`,
      );
    }

    const destinoRealId = dto.aceptada
      ? recomendacion.destinoRecomendadoId
      : dto.destinoRealId!;

    const destinoReal = await this.destinoProductivoRepo.findOne({
      where: {
        id: destinoRealId,
        empresaId: tenant.empresaId!,
      },
    });

    if (!destinoReal) {
      throw new NotFoundException(
        `Destino productivo ${destinoRealId} no encontrado`,
      );
    }

    recomendacion.estado = dto.aceptada
      ? 'aceptada'
      : 'rechazada';

    recomendacion.destinoRealId = destinoReal.id;
    recomendacion.destinoReal = destinoReal;

    // HU-37 AC1/AC3: la justificación solo aplica cuando hay divergencia
    // real, es decir, cuando se rechaza la recomendación. El DTO ya exige
    // el mínimo de caracteres en ese caso.
    if (!dto.aceptada) {
      recomendacion.justificacion = dto.justificacion!;
    }
    recomendacion.usuarioId = usuarioId;
    recomendacion.respondidaEn = new Date();

    /*
     * HU-49:
     *
     * Cuando la recomendación pertenece al lote original,
     * el destino real confirmado se guarda también en el lote.
     *
     * Cuando la recomendación pertenece a un consumo posterior
     * (HU-68), NO se modifica el destino productivo permanente
     * del lote original.
     */
    if (recomendacion.loteConsumoId == null) {
      const lote = await this.loteRepo.findOne({
        where: {
          id: recomendacion.lote.id,
          empresaId: tenant.empresaId!,
        },
      });

      if (!lote) {
        throw new NotFoundException(
          `Lote ${recomendacion.lote.id} no encontrado`,
        );
      }

      // HU-34: guardamos el destino anterior antes de pisarlo, para que
      // quede registrado en el historial unificado.
      const destinoAnteriorId = lote.destinoProductivoId ?? null;
      lote.destinoProductivoId = destinoReal.id;

      await this.loteRepo.save(lote);

      // HU-34: este cambio de destino vino de responder una recomendación
      // ML, no de una asignación manual — queda diferenciado por "origen".
      const historial = this.loteDestinoHistorialRepo.create({
        loteId: lote.id,
        empresaId: tenant.empresaId!,
        destinoProductivoId: destinoReal.id,
        destinoAnteriorId,
        usuarioId,
        origen: 'recomendacion_ml',
        recomendacionDestinoId: recomendacion.id,
      });
      await this.loteDestinoHistorialRepo.save(historial);
    }

    return this.recomendacionRepo.save(recomendacion);
  }

  // HU-49: consulta puntual de la recomendación pendiente de un lote, para
  // que el frontend deje de depender de un mock. Filtra por loteConsumoId
  // IS NULL: solo interesa la recomendación del lote original, no la de un
  // consumo parcial (ver la misma distinción en LoteConsumoService).
  async recomendacionPendientePorLote(
    loteId: number,
    tenant: TenantContext,
  ): Promise<RecomendacionPendienteResponseDto | null> {
    const empresaId = tenant.empresaId!;

    const lote = await this.loteRepo.findOne({
      where: { id: loteId, empresaId },
    });

    if (!lote) {
      throw new NotFoundException(`Lote ${loteId} no encontrado`);
    }

    const recomendacion = await this.recomendacionRepo.findOne({
      where: {
        lote: { id: loteId },
        empresa: { id: empresaId },
        estado: 'pendiente',
        loteConsumoId: IsNull(),
      },
      relations: {
        destinoRecomendado: true,
        destinoReal: true,
      },
      order: { createdAt: 'DESC' },
    });

    return recomendacion
      ? RecomendacionMapper.toPendienteResponseDto(recomendacion)
      : null;
  }

    async historialAciertos(tenant: TenantContext) {
    const recomendaciones = await this.recomendacionRepo.find({
      where: {
        empresa: {
          id: tenant.empresaId!,
        },
        estado: 'aceptada',
      },
    });

    const aciertos = recomendaciones.filter(
      (r) => r.destinoRecomendadoId === r.destinoRealId,
    ).length;

    return {
      total: recomendaciones.length,
      aciertos,
      tasaAcierto:
        recomendaciones.length > 0
          ? aciertos / recomendaciones.length
          : 0,
    };
  }

  // HU-37 AC8: reporte de lotes con divergencias justificadas, es decir,
  // recomendaciones respondidas donde el destino elegido difiere del
  // recomendado (equivale a estado === 'rechazada' en este modelo).
  async historialDivergencias(tenant: TenantContext) {
    const divergencias = await this.recomendacionRepo.find({
      where: {
        empresa: { id: tenant.empresaId! },
        estado: 'rechazada',
      },
      relations: {
        lote: true,
        destinoRecomendado: true,
        destinoReal: true,
      },
      order: { respondidaEn: 'DESC' },
    });

    return divergencias.map((d) => ({
      recomendacionId: d.id,
      loteId: d.lote.id,
      loteCodigo: d.lote.codigo,
      destinoRecomendadoId: d.destinoRecomendadoId,
      destinoRecomendadoNombre: d.destinoRecomendado.nombre,
      destinoRealId: d.destinoRealId,
      destinoRealNombre: d.destinoReal?.nombre ?? null,
      justificacion: d.justificacion,
      usuarioId: d.usuarioId,
      respondidaEn: d.respondidaEn,
    }));
  }

  async obtenerTodas(tenant: TenantContext) {
    const recomendaciones = await this.recomendacionRepo.find({
      where: {
        empresa: { id: tenant.empresaId! },
      },
      relations: {
        lote: true,
        destinoRecomendado: true,
        destinoReal: true,
      },
      order: { createdAt: 'DESC' },
    });

    return recomendaciones.map((r) => ({
      recomendacionId: r.id,
      loteId: r.lote.id,
      loteCodigo: r.lote.codigo,
      estado: r.estado,
      destinoRecomendadoId: r.destinoRecomendadoId,
      destinoRecomendadoNombre: r.destinoRecomendado?.nombre ?? null,
      destinoRealId: r.destinoRealId,
      destinoRealNombre: r.destinoReal?.nombre ?? null,
      confianza: r.confianza,
      justificacion: r.justificacion,
      usuarioId: r.usuarioId,
      createdAt: r.createdAt,
      respondidaEn: r.respondidaEn,
    }));
  }
}