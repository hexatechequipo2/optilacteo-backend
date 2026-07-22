import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Lote } from '../entities/lote.entity';
import { LoteFilterQueryDto } from '../dto/lote-filter-query.dto';
import type { ILoteRepository } from './lote-repository.interface';

@Injectable()
export class LoteRepository implements ILoteRepository {
  constructor(
    @InjectRepository(Lote)
    private readonly repository: Repository<Lote>,
  ) {}

  create(data: Partial<Lote>): Lote {
    return this.repository.create(data);
  }

  save(lote: Lote): Promise<Lote> {
    return this.repository.save(lote);
  }

  findById(id: number, empresaId: number): Promise<Lote | null> {
    return this.repository.findOne({
      where: { id, empresaId },
      relations: { parametros: true },
    });
  }

  findByCodigo(codigo: string, empresaId: number): Promise<Lote | null> {
    return this.repository.findOne({ where: { codigo, empresaId } });
  }

  async findAll(
    query: LoteFilterQueryDto,
    empresaId: number,
  ): Promise<[Lote[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { empresaId };
    if (query.estado) where.estado = query.estado;
    if (query.clasificacion) where.clasificacion = query.clasificacion;
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    if (query.fechaDesde && query.fechaHasta) {
      where.fechaIngreso = Between(
        new Date(query.fechaDesde),
        new Date(query.fechaHasta),
      );
    }

    return this.repository.findAndCount({
      where,
      relations: { parametros: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  countByEmpresa(empresaId: number): Promise<number> {
    return this.repository.count({ where: { empresaId } });
  }
}