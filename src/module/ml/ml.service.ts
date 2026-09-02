import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Not, Repository } from 'typeorm';
import { RecomendacionDestino } from './entities/recomendacion-destino.entity';
import type { IMlClient } from './interfaces/ml-client.interface';
import { ML_CLIENT } from './interfaces/ml-client.interface';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';
import { Lote } from '../lote/entities/lote.entity';
import { LoteParametro } from '../lote/entities/lote-parametro.entity';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { DestinoLote } from '../lote/enums/destino-lote.enum';

@Injectable()
export class MlService {
  constructor(
    @Inject(ML_CLIENT) private readonly mlClient: IMlClient,
    @InjectRepository(RecomendacionDestino)
    private readonly recomendacionRepo: Repository<RecomendacionDestino>,
  ) {}

  private extraerFeatures(
    parametros: LoteParametro[],
  ): Partial<Record<Parametro, number>> {
    const features: Partial<Record<Parametro, number>> = {};
    for (const p of parametros) {
      features[p.parametro] = Number(p.valor);
    }
    return features;
  }

  async generarRecomendacion(lote: Lote): Promise<RecomendacionDestino> {
    if (!lote.parametros || lote.parametros.length === 0) {
      throw new UnprocessableEntityException(
        'El lote no tiene parámetros registrados para generar una recomendación.',
      );
    }

    const features = this.extraerFeatures(lote.parametros);

    const resultado = await this.mlClient.predecirDestino({
      empresaId: lote.empresaId,
      parametros: features,
    });

    if (resultado.status === 'insufficient_data') {
      throw new UnprocessableEntityException(
        'No hay suficiente historial para generar una recomendación confiable.',
      );
    }

    const recomendacion = this.recomendacionRepo.create({
      lote,
      empresa: lote.empresa,
      destinoRecomendado: resultado.destinoRecomendado as DestinoLote,
      confianza: resultado.confianza,
    } as DeepPartial<RecomendacionDestino>);

    return this.recomendacionRepo.save(recomendacion);
  }

  async responderRecomendacion(
    id: number,
    dto: ResponderRecomendacionDto,
  ): Promise<RecomendacionDestino> {
    const recomendacion = await this.recomendacionRepo.findOneOrFail({
      where: { id },
    });

    recomendacion.estado = dto.aceptada ? 'aceptada' : 'rechazada';
    recomendacion.destinoReal = dto.destinoReal as DestinoLote;

    return this.recomendacionRepo.save(recomendacion);
  }

  async historialAciertos(empresaId: number) {
    const recomendaciones = await this.recomendacionRepo.find({
      where: { empresa: { id: empresaId }, estado: Not('pendiente') },
    });

    const aciertos = recomendaciones.filter(
      (r) => r.destinoRecomendado === r.destinoReal,
    ).length;

    return {
      total: recomendaciones.length,
      aciertos,
      tasaAcierto:
        recomendaciones.length > 0 ? aciertos / recomendaciones.length : 0,
    };
  }

  // TEMPORAL — solo para probar la conexión NestJS -> Python.
  // Borrar junto con el endpoint del controller una vez confirmado.
  async testConexion() {
    return this.mlClient.predecirDestino({
      empresaId: 1,
      parametros: {
        [Parametro.PH]: 6.6,
        [Parametro.TEMPERATURA]: 4,
        [Parametro.GRASA]: 3.2,
      },
    });
  }
}