import { Lote } from '../entities/lote.entity';
import { LoteFilterQueryDto } from '../dto/lote-filter-query.dto';

export const LOTE_REPOSITORY = 'LOTE_REPOSITORY';

export interface ILoteRepository {
  create(data: Partial<Lote>): Lote;
  save(lote: Lote): Promise<Lote>;
  findById(id: number, empresaId: number): Promise<Lote | null>;
  findByCodigo(codigo: string, empresaId: number): Promise<Lote | null>;
  findAll(
    query: LoteFilterQueryDto,
    empresaId: number,
  ): Promise<[Lote[], number]>;
  countByEmpresa(empresaId: number): Promise<number>;
}