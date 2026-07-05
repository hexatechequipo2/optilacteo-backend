import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import type { TenantContext } from '../types/tenant-context.type';
import { ROLES, type RolNombre } from '../../module/rol/constants/roles.constants';

type TenantEntity = { id: number; empresaId: number };

export abstract class TenantScopedRepository<T extends TenantEntity> {
  protected constructor(protected readonly repo: Repository<T>) {}

  private isGlobalAccess(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.ADMINISTRADOR;
  }

  protected scopedWhere(
    tenant: TenantContext,
    extra: FindOptionsWhere<T> = {} as FindOptionsWhere<T>,
  ): FindOptionsWhere<T> {
    if (this.isGlobalAccess(tenant)) {
      return extra;
    }

    return {
      ...extra,
      empresaId: tenant.empresaId,
    };
  }

  protected findAllScoped(
    tenant: TenantContext,
    options: Omit<FindManyOptions<T>, 'where'> = {},
  ): Promise<T[]> {
    return this.repo.find({
      ...options,
      where: this.scopedWhere(tenant),
    });
  }

  protected findAllScopedPaginated(
    tenant: TenantContext,
    skip: number,
    take: number,
    options: Omit<FindManyOptions<T>, 'where' | 'skip' | 'take'> = {},
  ): Promise<[T[], number]> {
    return this.repo.findAndCount({
      ...options,
      where: this.scopedWhere(tenant),
      skip,
      take,
    });
  }

  protected findByIdScoped(
    id: number,
    tenant: TenantContext,
  ): Promise<T | null> {
    return this.repo.findOne({
      where: this.scopedWhere(tenant, { id } as FindOptionsWhere<T>),
    });
  }

  protected findOneByScoped(
    tenant: TenantContext,
    extra: FindOptionsWhere<T>,
  ): Promise<T | null> {
    return this.repo.findOne({
      where: this.scopedWhere(tenant, extra),
    });
  }
}