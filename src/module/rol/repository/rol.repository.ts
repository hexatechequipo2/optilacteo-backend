import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../entities/rol.entity';
import { PermisoModulo } from '../../permiso/entities/permiso-modulo.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { IRolRepository } from './rol-interface.repository';

@Injectable()
export class RolRepository implements IRolRepository {
  constructor(
    @InjectRepository(Rol)
    private readonly repository: Repository<Rol>,
    @InjectRepository(PermisoModulo)
    private readonly permisoRepository: Repository<PermisoModulo>,
  ) {}

  async findById(id: number): Promise<Rol | null> {
    return this.repository.findOne({
      where: { id },
      relations: { permisos: true, empresa: true },
    });
  }

  async findAll(): Promise<Rol[]> {
    return this.repository.find({
      relations: { permisos: true, empresa: true },
    });
  }

  async findByEmpresa(empresaId: number): Promise<Rol[]> {
    return this.repository.find({
      where: { empresa: { id: empresaId } },
      relations: { permisos: true, empresa: true },
    });
  }

  async createRol(rol: Partial<Rol>): Promise<Rol> {
    const newRol = this.repository.create(rol);
    return this.repository.save(newRol);
  }

  async updateRol(id: number, rol: Partial<Rol>): Promise<Rol> {
    await this.repository.update(id, rol);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Rol with id ${id} not found after update`);
    }
    return updated;
  }

  async deleteRol(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async hasActiveUsers(id: number): Promise<boolean> {
    const rol = await this.repository.findOne({
      where: { id },
      relations: { permisos: true },
    });
    // Se valida contra la tabla users en el service, no acá directamente
    return false;
  }

  async createPermisos(permisos: Partial<PermisoModulo>[]): Promise<PermisoModulo[]> {
    const nuevos = this.permisoRepository.create(permisos);
    return this.permisoRepository.save(nuevos);
  }

  async findPermiso(rolId: number, modulo: ModuloSistema): Promise<PermisoModulo | null> {
    return this.permisoRepository.findOne({
      where: { rol: { id: rolId }, modulo },
      relations: { rol: true },
    });
  }

  async updatePermiso(id: number, canRead: boolean, canWrite: boolean): Promise<PermisoModulo> {
    await this.permisoRepository.update(id, { canRead, canWrite });
    const updated = await this.permisoRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`PermisoModulo with id ${id} not found after update`);
    }
    return updated;
  }
}