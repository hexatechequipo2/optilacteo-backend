import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import {
  DetectarAnomaliaParams,
  DetectarAnomaliaResultado,
  IAnomaliaClient,
} from '../interfaces/anomalia-client.interface';

@Injectable()
export class AnomaliaHttpClient implements IAnomaliaClient {
  private readonly logger = new Logger(AnomaliaHttpClient.name);

  constructor(private readonly httpService: HttpService) {}

  async detectar(
    params: DetectarAnomaliaParams,
  ): Promise<DetectarAnomaliaResultado> {
    const url = `${process.env.ML_SERVICE_URL}/anomalias/detectar`;

    const response = await firstValueFrom(
      this.httpService.post(url, {
        empresa_id: params.empresaId,
        parametro: params.parametro,
        valor: params.valor,
        historico_reciente: params.historicoReciente,
      }),
    );

    const data = response.data;

    if (data.status !== 'ok') {
      this.logger.log(
        `Microservicio ML devolvió status="${data.status}" para empresa ` +
          `${params.empresaId}, parámetro ${params.parametro}.`,
      );
    }

    return {
      status: data.status,
      esAnomalia: data.es_anomalia,
      parametro: data.parametro,
      tipoDesvio: data.tipo_desvio,
      confianza: data.confianza,
      modeloVersion: data.modelo_version,
    };
  }
}