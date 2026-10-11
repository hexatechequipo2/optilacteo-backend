import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import {
  ClasificarEstabilidadParams,
  ClasificarEstabilidadResultado,
  IEstabilidadClient,
} from '../interfaces/estabilidad-client.interface';

@Injectable()
export class EstabilidadHttpClient implements IEstabilidadClient {
  constructor(private readonly httpService: HttpService) {}

  async clasificar(
    params: ClasificarEstabilidadParams,
  ): Promise<ClasificarEstabilidadResultado> {
    const url = `${process.env.ML_SERVICE_URL}/estabilidad-proveedor/clasificar`;

    const response = await firstValueFrom(
      this.httpService.post(
        url,
        {
          empresa_id: params.empresaId,
          proveedor_id: params.proveedorId,
          series: params.series.map((s) => ({
            parametro: s.parametro,
            materia_prima: s.materiaPrima,
            valores: s.valores,
            umbral_min: s.umbralMin,
            umbral_max: s.umbralMax,
          })),
        },
        { timeout: 10000 },
      ),
    );

    const data = response.data;

    return {
      status: data.status,
      clasificacion: data.clasificacion,
      score: data.score,
      modeloVersion: data.modelo_version,
      detalle: data.detalle?.map((d: any) => ({
        parametro: d.parametro,
        materiaPrima: d.materia_prima,
        n: d.n,
        media: d.media,
        desvio: d.desvio,
        desvioNormalizado: d.desvio_normalizado,
        clasificacion: d.clasificacion,
      })),
    };
  }
}