import type { TenantContext } from '../../../common/types/tenant-context.type';
import { Proveedor } from '../entities/proveedor.entity';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';

export interface ProveedorFilters {
  razonSocial?: string;
  cuit?: string;
  telefono?: string;
  emailContacto?: string;
  provincia?: string;
  localidad?: string;
  tipo?: TipoProveedor;
  estado?: EstadoProveedor;
}

export interface IProveedorRepository {
  findAll(tenant: TenantContext): Promise<Proveedor[]>;
  findAllPaginated(
    tenant: TenantContext,
    skip: number,
    take: number,
    filters?: ProveedorFilters,
  ): Promise<[Proveedor[], number]>;
  findById(id: number, tenant: TenantContext): Promise<Proveedor | null>;
  findByCuit(cuit: string): Promise<Proveedor | null>;
  findByRazonSocial(razonSocial: string): Promise<Proveedor | null>;
  save(proveedor: Proveedor): Promise<Proveedor>;
  update(proveedor: Proveedor, tenant: TenantContext): Promise<Proveedor | null>;
  softDelete(id: number, tenant: TenantContext): Promise<boolean>;
  setEstado(id: number, estado: EstadoProveedor, tenant: TenantContext): Promise<boolean>;
  countByEmpresa(empresaId: number): Promise<number>;
}

export const PROVEEDOR_REPOSITORY = 'PROVEEDOR_REPOSITORY';