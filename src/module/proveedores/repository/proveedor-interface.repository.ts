import { Proveedor } from '../entities/proveedor.entity';

export interface IProveedorRepository {
  findAll(): Promise<Proveedor[]>;
  findById(id: number): Promise<Proveedor | null>;
  findByCuit(cuit: string): Promise<Proveedor | null>;
  save(proveedor: Proveedor): Promise<Proveedor>;
  update(proveedor: Proveedor): Promise<Proveedor>;
  delete(id: number): Promise<void>;
  countByEmpresa(empresaId: number): Promise<number>;
}

export const PROVEEDOR_REPOSITORY = 'PROVEEDOR_REPOSITORY';