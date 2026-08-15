import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngresoCamara } from '../entities/ingreso-camara.entity';
import { IIngresoCamaraRepository } from './ingreso-camara-repository.interface';
import { IngresoCamaraFilterQueryDto } from '../dto/ingreso-camara-filter-query.dto';

@Injectable()
export class IngresoCamaraRepository implements IIngresoCamaraRepository {
  constructor(
    @InjectRepository(IngresoCamara)
    private readonly repo: Repository<IngresoCamara>,
  ) {}

  create(data: Partial<IngresoCamara>): IngresoCamara {
    return this.repo.create(data);
  }

  save(ingreso: IngresoCamara): Promise<IngresoCamara> {
    return this.repo.save(ingreso);
  }

  findById(id: number, empresaId: number): Promise<IngresoCamara | null> {
    return this.repo.findOne({
      where: { id, empresaId },
      relations: { sku: true, lote: true },
    });
  }
  
  async findAll(
    query: IngresoCamaraFilterQueryDto,
    empresaId: number,
  ): Promise<[IngresoCamara[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('ingreso')
      .leftJoinAndSelect('ingreso.sku', 'sku')
      .leftJoinAndSelect('ingreso.lote', 'lote')
      .where('ingreso.empresaId = :empresaId', { empresaId })
      .orderBy('ingreso.fechaIngreso', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.skuId) {
      qb.andWhere('ingreso.skuId = :skuId', { skuId: query.skuId });
    }

    return qb.getManyAndCount();
  }
}