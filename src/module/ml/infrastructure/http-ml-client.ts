import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  IMlClient,
  LoteFeatures,
  RecomendacionDestinoResult,
} from '../interfaces/ml-client.interface';

@Injectable()
export class HttpMlClient implements IMlClient {
  private readonly logger = new Logger(HttpMlClient.name);
  // En Railway: http://optilacteo-ml.railway.internal:8000
  // En local (docker compose): http://ml-service:8000
  private readonly baseUrl =
    process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  constructor(private readonly http: HttpService) {}

  async predecirDestino(
    features: LoteFeatures,
  ): Promise<RecomendacionDestinoResult> {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/recommendations/destino`, {
          empresa_id: features.empresaId,
          grasa: features.grasa,
          proteina: features.proteina,
          acidez: features.acidez,
          temperatura: features.temperatura,
          ph: features.ph,
        }),
      );

      const data = response.data;

      if (data.status === 'insufficient_data') {
        return { status: 'insufficient_data' };
      }

      return {
        status: 'ok',
        destinoRecomendado: data.destino_recomendado,
        confianza: data.confianza,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error llamando al microservicio ML: ${error.message}`);
      } else {
        this.logger.error(`Error llamando al microservicio ML: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
