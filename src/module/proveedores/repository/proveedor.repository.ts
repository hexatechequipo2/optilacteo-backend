import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TenantScopedRepository } from '../../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { Proveedor } from '../entities/proveedor.entity';
import { IProveedorRepository, ProveedorFilters } from './proveedor-interface.repository';
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

  // Usa QueryBuilder (en vez de findAllScopedPaginated) porque la búsqueda
  // necesita un OR entre razonSocial y cuit con ILIKE, algo que el
  // FindOptionsWhere plano de TypeORM no puede expresar directamente.
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

    if (filters?.tipo) {
      qb.andWhere('proveedor.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.search) {
      qb.andWhere(
        `(proveedor.razonSocial ILIKE :search
          OR proveedor.cuit ILIKE :search
          OR proveedor.telefono ILIKE :search
          OR proveedor.emailContacto ILIKE :search
          OR proveedor.provincia ILIKE :search
          OR proveedor.localidad ILIKE :search
          OR proveedor.capacidad::text ILIKE :search)`,
        { search: `%${filters.search}%` },
      );
    }

    return qb.getManyAndCount();
  }

  async findById(id: number, tenant: TenantContext): Promise<Proveedor | null> {
    return this.findByIdScoped(id, tenant);
  }

  async findByCuit(cuit: string): Promise<Proveedor | null> {
    return this.repo.findOneBy({ cuit });
  }

  async save(proveedor: Proveedor): Promise<Proveedor> {
    return this.repo.save(proveedor);
  }

  async update(proveedor: Proveedor, tenant: TenantContext): Promise<Proveedor | null> {
    const { id, empresa, createdAt, updatedAt, ...columns } = proveedor;
    const result = await this.repo.update(
      this.scopedWhere(tenant, { id } as FindOptionsWhere<Proveedor>),
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
    const result = await this.repo.update(
      this.scopedWhere(tenant, { id } as FindOptionsWhere<Proveedor>),
      { estado },
    );
    return !!result.affected;
  }

  async countByEmpresa(empresaId: number): Promise<number> {
    return this.repo.countBy({ empresaId });
  }
}