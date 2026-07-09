import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository, UserFilters } from './user-repository.interface';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: {
        empresa: true,
        rol: { permisos: true },
      },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        empresa: true,
        rol: { permisos: true },
      },
    });
  }

  async findAll(tenant: TenantContext): Promise<User[]> {
    const where: FindOptionsWhere<User> =
      tenant.rolNombre === ROLES.ADMINISTRADOR
        ? {}
        : { empresa: { id: tenant.empresaId ?? -1 } };

    return this.repository.find({
      where,
      relations: { empresa: true, rol: true },
    });
  }

  async findAllPaginated(
    tenant: TenantContext,
    skip: number,
    take: number,
    filters?: UserFilters,
  ): Promise<[User[], number]> {
    const qb = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.empresa', 'empresa')
      .leftJoinAndSelect('user.rol', 'rol')
      .orderBy('user.name', 'ASC')
      .skip(skip)
      .take(take);

    if (tenant.rolNombre !== ROLES.ADMINISTRADOR) {
      qb.andWhere('empresa.id = :tenantEmpresaId', {
        tenantEmpresaId: tenant.empresaId ?? -1,
      });
    }

    if (filters?.name) {
      qb.andWhere('user.name ILIKE :name', { name: `%${filters.name}%` });
    }
    if (filters?.email) {
      qb.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    }
    if (filters?.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters?.rolId) {
      qb.andWhere('rol.id = :rolId', { rolId: filters.rolId });
    }
    // empresaId como filtro solo aplica si es admin: un no-admin ya está
    // scoped arriba a su propia empresa y no debe poder pedir otra.
    if (filters?.empresaId && tenant.rolNombre === ROLES.ADMINISTRADOR) {
      qb.andWhere('empresa.id = :filterEmpresaId', {
        filterEmpresaId: filters.empresaId,
      });
    }

    return qb.getManyAndCount();
  }

  async createUser(user: Partial<User>): Promise<User> {
    const newUser = this.repository.create(user);
    return this.repository.save(newUser);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    await this.repository.update(id, user);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User with id ${id} not found after update`);
    }
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await this.repository.delete(id);
    }
  
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.repository.update(userId, { password: passwordHash });
  }

  async incrementFailedAttempts(userId: number): Promise<void> {
    await this.repository.increment({ id: userId }, 'failedLoginAttempts', 1);
  }

  async lockUser(userId: number, lockedUntil: Date): Promise<void> {
    await this.repository.update(userId, { lockedUntil });
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    await this.repository.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }
  async countByEmpresa(empresaId: number): Promise<number> {
    return this.repository.count({ where: { empresa: { id: empresaId } } });
  }
}