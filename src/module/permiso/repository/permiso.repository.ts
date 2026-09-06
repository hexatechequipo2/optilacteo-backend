import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findById(id: number, empresaId: number): Promise<PermisoModulo | null> {
    return this.repository.findOne({
      where: { id, empresaId },
      relations: { rol: true },
    });
  }

  async findByRol(rolId: number, empresaId: number): Promise<PermisoModulo[]> {
    return this.repository.find({
      where: { rol: { id: rolId }, empresaId },
      relations: { rol: true },
    });
  }

  async findByUsuario(userId: number, empresaId: number): Promise<PermisoModulo[]> {
  const user = await this.userRepository.findOne({
    where: { id: userId, empresa: { id: empresaId } },
    relations: { rol: true },
  });

  if (!user?.rol) return [];

  return this.findByRolYEmpresa(user.rol.id, empresaId);
}

  // Usado tanto por findByUsuario como por AuthService.buildJwtPayload.
  // No filtra por request/tenant del controller porque se llama también
  // en login, donde no hay un guard de por medio todavía.
  async findByRolYEmpresa(
    rolId: number,
    empresaId: number,
  ): Promise<PermisoModulo[]> {
    return this.repository.find({
      where: { rol: { id: rolId }, empresaId },
    });
  }

  async updatePermiso(
    id: number,
    empresaId: number,
    canRead: boolean,
    canWrite: boolean,
  ): Promise<PermisoModulo> {
    const result = await this.repository.update(
      { id, empresaId },
      { canRead, canWrite },
    );

    if (!result.affected) {
      throw new NotFoundException(
        `Permiso ${id} no encontrado en la empresa`,
      );
    }

    const updated = await this.findById(id, empresaId);
    if (!updated) {
      throw new NotFoundException(`Permiso ${id} no encontrado tras actualizar`);
    }
    return updated;
  }
}