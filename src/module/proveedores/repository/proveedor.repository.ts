import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantScopedRepository } from '../../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { Proveedor } from '../entities/proveedor.entity';
import {
  IProveedorRepository,
  ProveedorFilters,
} from './proveedor-interface.repository';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

@Injectable()
export class ProveedorRepository
  extends TenantScopedRepository<Proveedor>
  implements IProveedorRepository
{
  constructor(
    @InjectRepository(Proveedor)
    repo: Repository<Proveedor>,
  ) {
    super(repo);
  }

  async findAll(tenant: TenantContext): Promise<Proveedor[]> {
    return this.findAllScoped(tenant, { order: { razonSocial: 'ASC' } });
  }

  async findAllPaginated(
    tenant: TenantContext,
    skip: number,
    take: number,
    filters?: ProveedorFilters,
  ): Promise<[Proveedor[], number]> {
    const qb = this.scopedQueryBuilder(tenant, 'proveedor')
      .orderBy('proveedor.razonSocial', 'ASC')
      .skip(skip)
      .take(take);

    if (filters?.razonSocial) {
      qb.andWhere('proveedor.razonSocial ILIKE :razonSocial', {
        razonSocial: `%${filters.razonSocial}%`,
      });
    }
    if (filters?.cuit) {
      qb.andWhere('proveedor.cuit ILIKE :cuit', { cuit: `%${filters.cuit}%` });
    }
    if (filters?.telefono) {
      qb.andWhere('proveedor.telefono ILIKE :telefono', {
        telefono: `%${filters.telefono}%`,
      });
    }
    if (filters?.emailContacto) {
      qb.andWhere('proveedor.emailContacto ILIKE :emailContacto', {
        emailContacto: `%${filters.emailContacto}%`,
      });
    }
    if (filters?.provincia) {
      qb.andWhere('proveedor.provincia ILIKE :provincia', {
        provincia: `%${filters.provincia}%`,
      });
    }
    if (filters?.localidad) {
      qb.andWhere('proveedor.localidad ILIKE :localidad', {
        localidad: `%${filters.localidad}%`,
      });
    }
    if (filters?.tipo) {
      qb.andWhere('proveedor.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters?.estado) {
      qb.andWhere('proveedor.estado = :estado', { estado: filters.estado });
    }

    return qb.getManyAndCount();
  }

  async findById(id: number, tenant: TenantContext): Promise<Proveedor | null> {
    // Usamos el scopedQueryBuilder para mantener la seguridad multi-tenant
    const qb = this.scopedQueryBuilder(tenant, 'proveedor')
      .leftJoinAndSelect('proveedor.empresa', 'empresa') // <-- CARGAMOS LA RELACIÓN
      .where('proveedor.id = :id', { id });

    return qb.getOne();
  }

  // La unicidad de CUIT es por empresa (UQ_proveedores_empresa_cuit).
  async findByCuit(cuit: string, empresaId: number): Promise<Proveedor | null> {
    return this.repo.findOneBy({ cuit: cuit.trim(), empresaId });
  }

  // Comparación sin distinguir mayúsculas ni espacios en los bordes, dentro
  // de la empresa. LOWER() en vez de ILIKE para que % y _ no actúen de comodín.
  async findByRazonSocial(
    razonSocial: string,
    empresaId: number,
  ): Promise<Proveedor | null> {
    return this.repo
      .createQueryBuilder('proveedor')
      .where('LOWER(TRIM(proveedor.razonSocial)) = LOWER(TRIM(:razonSocial))', {
        razonSocial,
      })
      .andWhere('proveedor.empresaId = :empresaId', { empresaId })
      .getOne();
  }

  async save(proveedor: Proveedor): Promise<Proveedor> {
    return this.repo.save(proveedor);
  }

  async update(
    proveedor: Proveedor,
    tenant: TenantContext,
  ): Promise<Proveedor | null> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, empresa, createdAt, updatedAt, ...columns } = proveedor;
    const result = await this.repo.update(
      this.scopedWhere(tenant, { id }),
      columns,
    );
    if (!result.affected) {
      return null;
    }
    return this.repo.findOneBy({ id });
  }

  async softDelete(id: number, tenant: TenantContext): Promise<boolean> {
    return this.setEstado(id, EstadoProveedor.SUSPENDIDA, tenant);
  }

  async setEstado(
    id: number,
    estado: EstadoProveedor,
    tenant: TenantContext,
  ): Promise<boolean> {
    const result = await this.repo.update(this.scopedWhere(tenant, { id }), {
      estado,
    });
    return !!result.affected;
  }

  async countByEmpresa(empresaId: number): Promise<number> {
    return this.repo.countBy({ empresaId });
  }
}