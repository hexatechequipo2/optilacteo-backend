import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { Lote } from '../entities/lote.entity';
import { LoteFilterQueryDto } from '../dto/lote-filter-query.dto';
import type { ILoteRepository } from './lote-repository.interface';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';

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

  async findNoAptosSinRevisionVigente(empresaId: number): Promise<Lote[]> {
    return this.repository
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.parametros', 'parametros')
      .where('lote.empresaId = :empresaId', { empresaId })
      .andWhere('lote.clasificacion = :clasificacion', {
        clasificacion: 'no_apto',
      })
      .andWhere(
        `NOT EXISTS (
        SELECT 1 FROM lote_revision_calidad rev
        WHERE rev."loteId" = lote.id
        AND rev."createdAt" > COALESCE((
          SELECT MAX(hist."createdAt") FROM lote_clasificacion_historial hist
          WHERE hist."loteId" = lote.id AND hist.clasificacion = 'no_apto'
        ), rev."createdAt" - INTERVAL '1 second')
      )`,
      )
      .orderBy('lote.createdAt', 'DESC')
      .getMany();
  }

  async findUltimosAptos(
    empresaId: number,
    materiaPrima: TipoMateriaPrima,
    cantidad: number,
    excluirLoteId: number,
  ): Promise<Lote[]> {
    return this.repository.find({
      where: {
        empresaId,
        materiaPrima,
        clasificacion: ClasificacionLote.APTO,
        id: Not(excluirLoteId),
      },
      relations: { parametros: true },
      order: { createdAt: 'DESC' },
      take: cantidad,
    });
  }

  // HU-66: lotes de un proveedor que tienen valor comprometido cargado
  // (única condición para entrar al histórico de desvíos).
  findConDesvioByProveedor(
    proveedorId: number,
    empresaId: number,
  ): Promise<Lote[]> {
    return this.repository.find({
      where: {
        proveedorId,
        empresaId,
        cantidadComprometidaKg: Not(IsNull()),
      },
      relations: { parametros: true },
      order: { fechaIngreso: 'DESC' },
    });
  }
}
