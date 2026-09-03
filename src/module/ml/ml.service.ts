import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Not, Repository } from 'typeorm';

import { RecomendacionDestino } from './entities/recomendacion-destino.entity';
import type { IMlClient } from './interfaces/ml-client.interface';
import { ML_CLIENT } from './interfaces/ml-client.interface';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';

import { Parametro } from '../config-parametro/enums/parametro.enum';
import { DestinoProductivo } from '../destino-productivo/entities/destino-productivo.entity';
import { Lote } from '../lote/entities/lote.entity';

import type { TenantContext } from '../../common/types/tenant-context.type';

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

      lote.destinoProductivoId = destinoReal.id;

      await this.loteRepo.save(lote);
    }

    return this.recomendacionRepo.save(recomendacion);
  }

  async historialAciertos(tenant: TenantContext) {
    const recomendaciones = await this.recomendacionRepo.find({
      where: {
        empresa: {
          id: tenant.empresaId!,
        },
        estado: Not('pendiente'),
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
}