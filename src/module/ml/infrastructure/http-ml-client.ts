import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  IMlClient,
  LoteFeatures,
  RecomendacionDestinoResult,
} from '../interfaces/ml-client.interface';
import { DestinoLote } from '../../lote/enums/destino-lote.enum';

@Injectable()
export class HttpMlClient implements IMlClient {
  private readonly logger = new Logger(HttpMlClient.name);
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
          parametros: features.parametros,
        }),
      );

      const data = response.data;

      if (data.status === 'insufficient_data') {
        return { status: 'insufficient_data' };
      }

      return {
        status: 'ok',
        destinoRecomendado: data.destino_recomendado as DestinoLote,
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