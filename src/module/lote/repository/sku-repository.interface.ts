import { Sku } from '../entities/sku.entity';

export const SKU_REPOSITORY = 'SKU_REPOSITORY';

export interface ISkuRepository {
  create(data: Partial<Sku>): Sku;
  save(sku: Sku): Promise<Sku>;
  findById(id: number, empresaId: number): Promise<Sku | null>;
  findByNombre(nombre: string, empresaId: number): Promise<Sku | null>;
  findAllActivosByEmpresa(empresaId: number): Promise<Sku[]>;
}