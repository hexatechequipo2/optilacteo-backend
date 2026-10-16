import type { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import type { Parametro } from '../../config-parametro/enums/parametro.enum';
import type { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import type { RecomendacionDestino } from '../../ml/entities/recomendacion-destino.entity';
import type { Lote } from '../../lote/entities/lote.entity';

export interface LecturaDemo {
  loteId: number;
  parametro: Parametro;
  valor: number;
  timestampLectura: Date;
}

export type LoteDemo = Pick<
  Lote,
  'id' | 'codigo' | 'clasificacion' | 'materiaPrima'
>;

// Consultas que necesitan el resumen y el tablero de la demo y que no
// expone ningún repositorio existente. Todas filtran por empresaId y las
// de lotes van en lote (una consulta para N lotes: el tablero se pide cada
// 1-2 s).
export interface IDemoRepository {
  // Lecturas de los lotes en orden cronológico (más vieja primero).
  findLecturasDeLotes(
    loteIds: number[],
    empresaId: number,
  ): Promise<LecturaDemo[]>;
  findLotes(loteIds: number[], empresaId: number): Promise<LoteDemo[]>;
  findUmbrales(
    empresaId: number,
    materiaPrima: TipoMateriaPrima,
  ): Promise<ConfiguracionParametro[]>;
  // Cada alerta se persiste una vez por destinatario: cuenta alertas únicas
  // por lote. Los lotes sin alertas no aparecen en el Map.
  contarAlertasPorLote(
    loteIds: number[],
    empresaId: number,
  ): Promise<Map<number, number>>;
  // Recomendación del lote original (no de un consumo parcial) creada
  // después de `desde`.
  findRecomendacionPosteriorA(
    loteId: number,
    empresaId: number,
    desde: Date,
  ): Promise<RecomendacionDestino | null>;
  // UPDATE condicional (compare-and-set) del nombre: solo cambia si el
  // nombre actual sigue siendo `nombreEsperado`. Devuelve si cambió.
  reemplazarNombreSensor(
    sensorId: number,
    empresaId: number,
    nombreEsperado: string,
    nombreNuevo: string,
  ): Promise<boolean>;
}

export const DEMO_REPOSITORY = 'IDemoRepository';
