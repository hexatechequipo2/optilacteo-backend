import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from '../lote/entities/lote.entity';

// Mínimo de parámetros de calidad que debe tener un lote para servir
// como muestra de entrenamiento. El formulario de alta pide "al menos
// uno", así que exigir los siete dejaría el dataset vacío. Valor
// pendiente de definición con el equipo de modelo.
export const MIN_PARAMETROS_ENTRENAMIENTO = 3;

// Nombres exactos esperados por FEATURES en
// ml-service/app/training/train_destino.py.
export interface LoteEntrenamientoRow {
  ph: number | null;
  temperatura: number | null;
  densidad: number | null;
  grasa: number | null;
  proteina: number | null;
  acidez: number | null;
  conductividad: number | null;
  destino_real: string;
}

interface LoteEntrenamientoRawRow {
  ph: string | null;
  temperatura: string | null;
  densidad: string | null;
  grasa: string | null;
  proteina: string | null;
  acidez: string | null;
  conductividad: string | null;
  destino_real: string;
}

@Injectable()
export class MlTrainingDataService {
  private readonly logger = new Logger(MlTrainingDataService.name);

  constructor(
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
  ) {}

  async obtenerLotesParaEntrenamiento(
    empresaId: number,
  ): Promise<LoteEntrenamientoRow[]> {
    const rawRows = await this.loteRepo
      .createQueryBuilder('lote')
      .innerJoin('lote.destinoProductivo', 'destino')
      .leftJoin('lote.parametros', 'p')
      .where('lote.empresaId = :empresaId', { empresaId })
      // Redundante con el innerJoin de arriba (que ya excluye nulls), pero
      // explícito según lo pedido: el filtro es "destinoProductivoId no nulo".
      .andWhere('lote.destinoProductivoId IS NOT NULL')
      .select('destino.nombre', 'destino_real')
      .addSelect(`MAX(p.valor) FILTER (WHERE p.parametro = 'ph')`, 'ph')
      .addSelect(
        `MAX(p.valor) FILTER (WHERE p.parametro = 'temperatura')`,
        'temperatura',
      )
      .addSelect(
        `MAX(p.valor) FILTER (WHERE p.parametro = 'densidad')`,
        'densidad',
      )
      .addSelect(`MAX(p.valor) FILTER (WHERE p.parametro = 'grasa')`, 'grasa')
      .addSelect(
        `MAX(p.valor) FILTER (WHERE p.parametro = 'proteina')`,
        'proteina',
      )
      .addSelect(`MAX(p.valor) FILTER (WHERE p.parametro = 'acidez')`, 'acidez')
      .addSelect(
        `MAX(p.valor) FILTER (WHERE p.parametro = 'conductividad')`,
        'conductividad',
      )
      .groupBy('lote.id')
      .addGroupBy('destino.nombre')
      .having('COUNT(DISTINCT p.parametro) >= :minimo', {
        minimo: MIN_PARAMETROS_ENTRENAMIENTO,
      })
      .getRawMany<LoteEntrenamientoRawRow>();

    this.logger.log(
      `Se encontraron ${rawRows.length} lotes para entrenamiento (empresaId=${empresaId})`,
    );

    return rawRows.map((row) => ({
      ph: this.toNumberOrNull(row.ph),
      temperatura: this.toNumberOrNull(row.temperatura),
      densidad: this.toNumberOrNull(row.densidad),
      grasa: this.toNumberOrNull(row.grasa),
      proteina: this.toNumberOrNull(row.proteina),
      acidez: this.toNumberOrNull(row.acidez),
      conductividad: this.toNumberOrNull(row.conductividad),
      destino_real: row.destino_real,
    }));
  }

  // Los numeric de Postgres vuelven como string desde el driver. Los
  // faltantes (columna pivoteada sin ninguna fila) vuelven null y deben
  // quedar null: cómo tratarlos es decisión del microservicio, no de acá.
  private toNumberOrNull(valor: string | null): number | null {
    return valor === null ? null : Number(valor);
  }
}
