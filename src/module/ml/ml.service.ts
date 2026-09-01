import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Not, Repository } from 'typeorm';
import { RecomendacionDestino } from './entities/recomendacion-destino.entity';
import type { IMlClient, LoteFeatures } from './interfaces/ml-client.interface';
import { ResponderRecomendacionDto } from './dto/responder-recomendacion.dto';
import { Lote } from '../lote/entities/lote.entity';
import { LoteParametro } from '../lote/entities/lote-parametro.entity';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { DestinoLote } from '../lote/enums/destino-lote.enum';
import { ML_CLIENT } from './interfaces/ml-client.interface';

@Injectable()
export class MlService {
  constructor(
    @Inject(ML_CLIENT) private readonly mlClient: IMlClient,
    @InjectRepository(RecomendacionDestino)
    private readonly recomendacionRepo: Repository<RecomendacionDestino>,
  ) {}

  async generarRecomendacion(lote: Lote): Promise<RecomendacionDestino> {
    if (!lote.parametros || lote.parametros.length === 0) {
      throw new UnprocessableEntityException(
        'El lote no tiene parámetros registrados para generar una recomendación.',
      );
    }

    // ✅ Extraemos los valores dinámicos
    const features = this.extraerFeatures(lote.parametros);

    // ✅ Construimos el payload completo que cumple con LoteFeatures
    const payload: LoteFeatures = {
      empresaId: lote.empresaId,
      grasa: features.grasa,
      proteina: features.proteina,
      acidez: features.acidez,
      temperatura: features.temperatura,
      ph: features.ph,
    };

    const resultado = await this.mlClient.predecirDestino(payload);

    if (resultado.status === 'insufficient_data') {
      throw new UnprocessableEntityException(
        'No hay suficiente historial para generar una recomendación confiable.',
      );
    }

    const recomendacion = this.recomendacionRepo.create({
      lote: lote,
      empresa: lote.empresa,
      destinoRecomendado: resultado.destinoRecomendado as DestinoLote,
      confianza: resultado.confianza,
    } as DeepPartial<RecomendacionDestino>);

    return this.recomendacionRepo.save(recomendacion);
  }

  private extraerFeatures(parametros: LoteParametro[]): Record<string, number> {
    const mapa = new Map(parametros.map(p => [p.parametro, Number(p.valor)]));
    return {
      grasa: mapa.get(Parametro.GRASA) ?? 0,
      proteina: mapa.get(Parametro.PROTEINA) ?? 0,
      acidez: mapa.get(Parametro.ACIDEZ) ?? 0,
      temperatura: mapa.get(Parametro.TEMPERATURA) ?? 0,
      ph: mapa.get(Parametro.PH) ?? 0,
    };
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
}
