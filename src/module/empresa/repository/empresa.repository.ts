import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from '../entities/empresa.entity';
import { IEmpresaRepository } from './empresa-repository.interface';

@Injectable()
export class EmpresaRepository implements IEmpresaRepository {
  constructor(
    @InjectRepository(Empresa)
    private readonly repository: Repository<Empresa>,
  ) {}

  async findById(id: number): Promise<Empresa | null> {
    return this.repository.findOne({
      where: { id },
      relations: { users: true },
    });
  }

  async findAll(): Promise<Empresa[]> {
    return this.repository.find();
  }

  async createEmpresa(empresa: Partial<Empresa>): Promise<Empresa> {
    const newEmpresa = this.repository.create(empresa);
    return this.repository.save(newEmpresa);
  }

  async updateEmpresa(id: number, empresa: Partial<Empresa>): Promise<Empresa> {
    await this.repository.update(id, empresa);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Empresa with id ${id} not found after update`);
    }
    return updated;
  }

  async deleteEmpresa(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async hasActiveUsers(id: number): Promise<boolean> {
    const empresa = await this.findById(id);
    if (!empresa?.users) return false;
    return empresa.users.some((user) => user.isActive);
  }
}