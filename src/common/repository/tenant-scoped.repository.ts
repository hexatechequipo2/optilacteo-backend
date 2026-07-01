import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import type { TenantContext } from '../types/tenant-context.type';

type TenantEntity = { id: number; empresaId: number };

export abstract class TenantScopedRepository<T extends TenantEntity> {
  protected constructor(protected readonly repo: Repository<T>) {}

  protected scopedWhere(
    tenant: TenantContext,
    extra: FindOptionsWhere<T> = {} as FindOptionsWhere<T>,
  ): FindOptionsWhere<T> {
    return tenant.isAdmin ? extra : { ...extra, empresaId: tenant.empresaId };
  }

  protected findAllScoped(
    tenant: TenantContext,
    options: Omit<FindManyOptions<T>, 'where'> = {},
  ): Promise<T[]> {
    return this.repo.find({ ...options, where: this.scopedWhere(tenant) });
  }

  protected findByIdScoped(id: number, tenant: TenantContext): Promise<T | null> {
    return this.repo.findOne({
      where: this.scopedWhere(tenant, { id } as FindOptionsWhere<T>),
    });
  }

  protected findOneByScoped(
    tenant: TenantContext,
    extra: FindOptionsWhere<T>,
  ): Promise<T | null> {
    return this.repo.findOne({ where: this.scopedWhere(tenant, extra) });
  }
}
