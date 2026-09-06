import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import {
  IPrediccionClient,
  PredecirVolumenParams,
  PredecirVolumenResultado,
} from '../interfaces/prediccion-client.interface';

@Injectable()
export class PrediccionHttpClient implements IPrediccionClient {
  private readonly logger = new Logger(PrediccionHttpClient.name);

  constructor(private readonly httpService: HttpService) {}

  async predecir(
    params: PredecirVolumenParams,
  ): Promise<PredecirVolumenResultado> {
    const url = `${process.env.ML_SERVICE_URL}/volumen/predecir`;

    const response = await firstValueFrom(
      this.httpService.post(url, {
        empresa_id: params.empresaId,
        tipo_materia_prima: params.tipoMateriaPrima,
        serie_historica: params.serieHistorica,
      }),
    );

    const data = response.data;

    if (data.status !== 'ok') {
      this.logger.log(
        `Predicción de volumen insuficiente para empresa ${params.empresaId}, ` +
          `materia prima ${params.tipoMateriaPrima}.`,
      );
    }

    return {
      status: data.status,
      dias: data.dias,
      modeloVersion: data.modelo_version,
    };
  }
}