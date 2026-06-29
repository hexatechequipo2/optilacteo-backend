import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from '../entities/proveedor.entity';
import { IProveedorRepository } from './proveedor-interface.repository';

@Injectable()
export class ProveedorRepository implements IProveedorRepository {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  async findAll(): Promise<Proveedor[]> {
    return this.repo.find({ order: { razonSocial: 'ASC' } });
  }

  async findById(id: number): Promise<Proveedor | null> {
    return this.repo.findOneBy({ id });
  }

  async findByCuit(cuit: string): Promise<Proveedor | null> {
    return this.repo.findOneBy({ cuit });
  }

  async save(proveedor: Proveedor): Promise<Proveedor> {
    return this.repo.save(proveedor);
  }

  async update(proveedor: Proveedor): Promise<Proveedor> {
    return this.repo.save(proveedor);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async countByEmpresa(empresaId: number): Promise<number> {
    return this.repo.countBy({ empresaId });
  }
}