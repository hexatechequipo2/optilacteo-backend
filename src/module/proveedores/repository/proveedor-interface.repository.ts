import type { TenantContext } from '../../../common/types/tenant-context.type';
import { Proveedor } from '../entities/proveedor.entity';

export interface IProveedorRepository {
  findAll(tenant: TenantContext): Promise<Proveedor[]>;
  findAllPaginated(
    tenant: TenantContext,
    skip: number,
    take: number,
  ): Promise<[Proveedor[], number]>;
  findById(id: number, tenant: TenantContext): Promise<Proveedor | null>;
  findByCuit(cuit: string): Promise<Proveedor | null>;
  save(proveedor: Proveedor): Promise<Proveedor>;
  update(proveedor: Proveedor, tenant: TenantContext): Promise<Proveedor | null>;
  delete(id: number, tenant: TenantContext): Promise<boolean>;
  countByEmpresa(empresaId: number): Promise<number>;
}

export const PROVEEDOR_REPOSITORY = 'PROVEEDOR_REPOSITORY';