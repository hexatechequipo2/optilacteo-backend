import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermisoModulo } from '../entities/permiso-modulo.entity';
import { User } from '../../user/entities/user.entity';
import { IPermisoRepository } from './permiso-interface.repository';

@Injectable()
export class PermisoRepository implements IPermisoRepository {
  constructor(
    @InjectRepository(PermisoModulo)
    private readonly repository: Repository<PermisoModulo>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<PermisoModulo | null> {
    return this.repository.findOne({
      where: { id },
      relations: { rol: true },
    });
  }

  async findByRol(rolId: number): Promise<PermisoModulo[]> {
    return this.repository.find({
      where: { rol: { id: rolId } },
      relations: { rol: true },
    });
  }

  async findByUsuario(userId: number): Promise<PermisoModulo[]> {
    // Busca el usuario, trae su rol y los permisos de ese rol
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { rol: { permisos: true } },
    });

    if (!user?.rol?.permisos) return [];
    return user.rol.permisos;
  }

  async updatePermiso(
    id: number,
    canRead: boolean,
    canWrite: boolean,
  ): Promise<PermisoModulo> {
    await this.repository.update(id, { canRead, canWrite });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`PermisoModulo with id ${id} not found after update`);
    }
    return updated;
  }
}