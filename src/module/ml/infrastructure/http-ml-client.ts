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
        destinoRecomendado: data.destino_recomendado,
        confianza: data.confianza,
      };
    } catch (error) {
      const code = this.extractErrorCode(error);
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);

      // Timeout o servicio inalcanzable: condición operativa esperable
      // (el microservicio puede estar caído, redeployando, etc.), no un bug.
      const esFalloOperativoEsperable =
        code !== undefined &&
        ['ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code);

      if (esFalloOperativoEsperable) {
        this.logger.warn(`Microservicio ML no disponible (${code}): ${message}`);
      } else {
        this.logger.error(`Error inesperado llamando al microservicio ML: ${message}`);
      }

      // Degradación deliberada: el alta de un lote no puede depender de que
      // el microservicio de ML esté arriba. Ante timeout, servicio caído o
      // cualquier error inesperado, devolvemos el mismo resultado que el
      // propio microservicio usa cuando no tiene modelo entrenado, para que
      // quien llame siga el flujo sin recomendación en vez de romperse.
      return { status: 'insufficient_data' };
    }
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }
}
