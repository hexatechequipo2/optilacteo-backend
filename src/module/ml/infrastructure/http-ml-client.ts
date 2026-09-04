import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HttpMlClient {
  private readonly logger = new Logger(HttpMlClient.name);
  private readonly baseUrl =
    process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  constructor(private readonly http: HttpService) {}

  // Método existente: predicción de destino
  async predecirDestino(features: any): Promise<any> {
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
      return this.handleError(error);
    }
  }

  async detectarAnomalia(
    empresaId: number,
    parametro: string,
    valor: number,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/anomalias/detectar`, {
          empresa_id: empresaId,
          parametro,
          valor,
        }),
      );

      const data = response.data;
      if (data.status === 'insufficient_data') {
        return { status: 'insufficient_data' };
      }
      if (data.status === 'invalid_data') {
        return { status: 'invalid_data' };
      }

      return {
        status: 'ok',
        esAnomalia: data.es_anomalia,
        confianza: data.confianza,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown): any {
    const code = this.extractErrorCode(error);
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);

    const esFalloOperativoEsperable =
      code !== undefined &&
      ['ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code);

    if (esFalloOperativoEsperable) {
      this.logger.warn(`Microservicio ML no disponible (${code}): ${message}`);
    } else {
      this.logger.error(`Error inesperado llamando al microservicio ML: ${message}`);
    }

    return { status: 'insufficient_data' };
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }
}
