import { PrediccionVolumen } from '../entities/prediccion-volumen.entity';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

export const PREDICCION_VOLUMEN_REPOSITORY = 'PREDICCION_VOLUMEN_REPOSITORY';

export interface IPrediccionVolumenRepository {
  create(prediccion: Partial<PrediccionVolumen>): Promise<PrediccionVolumen>;

  findUltimaVigente(
    empresaId: number,
    tipoMateriaPrima: TipoMateriaPrima,
  ): Promise<PrediccionVolumen | null>;

  /**
   * Serie diaria de volumen recepcionado, agregada desde `lotes`, para un
   * rango de fechas. Usada tanto para armar el histórico reciente del
   * dashboard como (en la práctica) para lo que el microservicio ML pide
   * vía el endpoint interno de series históricas de volumen.
   */
  obtenerSerieHistorica(
    empresaId: number,
    tipoMateriaPrima: TipoMateriaPrima,
    desde: Date,
    hasta: Date,
  ): Promise<{ fecha: string; valor: number }[]>;

  /**
   * Lista de empresas que tienen al menos un lote de la materia prima
   * dada, usada por el cron para saber sobre qué (empresa, materiaPrima)
   * iterar sin tener que recorrer todas las empresas del sistema a ciegas.
   */
  findEmpresasConDatos(tipoMateriaPrima: TipoMateriaPrima): Promise<number[]>;
}