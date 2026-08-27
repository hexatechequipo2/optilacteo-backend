import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tambo } from '../entities/tambo.entity';
import type { ITamboRepository } from './tambo-interface.repository';

@Injectable()
export class TamboRepository implements ITamboRepository {
  constructor(
    @InjectRepository(Tambo)
    private readonly repo: Repository<Tambo>,
  ) {}

  create(data: Partial<Tambo>): Tambo {
    return this.repo.create(data);
  }

  save(tambo: Tambo): Promise<Tambo> {
    return this.repo.save(tambo);
  }

  findById(id: number, empresaId: number): Promise<Tambo | null> {
    return this.repo.findOne({
      where: { id, empresaId },
      relations: { proveedor: true },
    });
  }

  findAllByEmpresa(empresaId: number): Promise<Tambo[]> {
    return this.repo.find({
      where: { empresaId, activo: true },
      order: { nombre: 'ASC' },
    });
  }

  findByProveedor(proveedorId: number, empresaId: number): Promise<Tambo[]> {
    return this.repo.find({
      where: { proveedorId, empresaId, activo: true },
      order: { nombre: 'ASC' },
    });
  }
}