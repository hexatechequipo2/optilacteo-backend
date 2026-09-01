import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sku } from '../entities/sku.entity';
import { ISkuRepository } from './sku-repository.interface';

@Injectable()
export class SkuRepository implements ISkuRepository {
  constructor(
    @InjectRepository(Sku)
    private readonly repo: Repository<Sku>,
  ) {}

  create(data: Partial<Sku>): Sku {
    return this.repo.create(data);
  }

  save(sku: Sku): Promise<Sku> {
    return this.repo.save(sku);
  }

  findById(id: number, empresaId: number): Promise<Sku | null> {
    return this.repo.findOne({ where: { id, empresaId } });
  }

  findByNombre(nombre: string, empresaId: number): Promise<Sku | null> {
    return this.repo.findOne({ where: { nombre, empresaId } });
  }

  findAllActivosByEmpresa(empresaId: number): Promise<Sku[]> {
    return this.repo.find({
      where: { empresaId, activo: true },
      order: { nombre: 'ASC' },
    });
  }
}
