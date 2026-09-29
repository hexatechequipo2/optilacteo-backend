import type { DetalleEstabilidad } from '../entities/proveedor-estabilidad.entity';

export const ESTABILIDAD_CLIENT = 'ESTABILIDAD_CLIENT';

export interface SerieEstabilidad {
  parametro: string;
  materiaPrima: string;
  valores: number[];
  umbralMin: number | null;
  umbralMax: number | null;
}

export interface ClasificarEstabilidadParams {
  empresaId: number;
  proveedorId: number;
  series: SerieEstabilidad[];
}

export interface ClasificarEstabilidadResultado {
  status: 'ok' | 'insufficient_data' | 'invalid_data';
  clasificacion?: string;
  score?: number;
  detalle?: DetalleEstabilidad[];
  modeloVersion?: string;
}

export interface IEstabilidadClient {
  clasificar(
    params: ClasificarEstabilidadParams,
  ): Promise<ClasificarEstabilidadResultado>;
}