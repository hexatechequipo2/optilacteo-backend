import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository } from './user-repository.interface';
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