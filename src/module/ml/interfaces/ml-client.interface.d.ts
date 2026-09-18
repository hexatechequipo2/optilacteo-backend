export declare const ML_CLIENT: unique symbol;
export interface LoteFeatures {
    empresaId: number;
    grasa: number;
    proteina: number;
    acidez: number;
    temperatura: number;
    ph: number;
}
export interface RecomendacionDestinoResult {
    status: 'ok' | 'insufficient_data';
    destinoRecomendado?: string;
    confianza?: number;
}
export interface IMlClient {
    predecirDestino(features: LoteFeatures): Promise<RecomendacionDestinoResult>;
}
