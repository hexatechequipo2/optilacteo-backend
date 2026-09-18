import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PrediccionVolumen } from '../entities/prediccion-volumen.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { IPrediccionVolumenRepository } from './prediccion-volumen.repository.interface';

@Injectable()
export class PrediccionVolumenRepository implements IPrediccionVolumenRepository {
  constructor(
    @InjectRepository(PrediccionVolumen)
    private readonly repo: Repository<PrediccionVolumen>,

    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
  ) {}

  create(
    prediccion: Partial<PrediccionVolumen>,
  ): Promise<PrediccionVolumen> {
    const entity = this.repo.create(prediccion);
    return this.repo.save(entity);
  }

  findUltimaVigente(
    empresaId: number,
    tipoMateriaPrima: TipoMateriaPrima,
  ): Promise<PrediccionVolumen | null> {
    return this.repo.findOne({
      where: { empresaId, tipoMateriaPrima },
      order: { fechaGeneracion: 'DESC' },
    });
  }

  async obtenerSerieHistorica(
    empresaId: number,
    tipoMateriaPrima: TipoMateriaPrima,
    desde: Date,
    hasta: Date,
  ): Promise<{ fecha: string; valor: number }[]> {
    const filas = await this.loteRepo
      .createQueryBuilder('lote')
      .where('lote.empresaId = :empresaId', { empresaId })
      .andWhere('lote.materiaPrima = :tipoMateriaPrima', { tipoMateriaPrima })
      .andWhere('lote.cantidad IS NOT NULL')
      .andWhere('lote.fechaIngreso BETWEEN :desde AND :hasta', { desde, hasta })
      .select("TO_CHAR(lote.fechaIngreso, 'YYYY-MM-DD')", 'fecha')
      .addSelect('SUM(lote.cantidad)', 'valor')
      .groupBy("TO_CHAR(lote.fechaIngreso, 'YYYY-MM-DD')")
      .orderBy('fecha', 'ASC')
      .getRawMany<{ fecha: string; valor: string }>();

    return filas.map((f) => ({ fecha: f.fecha, valor: Number(f.valor) }));
  }

  async findEmpresasConDatos(
    tipoMateriaPrima: TipoMateriaPrima,
  ): Promise<number[]> {
    const filas = await this.loteRepo
      .createQueryBuilder('lote')
      .where('lote.materiaPrima = :tipoMateriaPrima', { tipoMateriaPrima })
      .andWhere('lote.cantidad IS NOT NULL')
      .select('DISTINCT lote.empresaId', 'empresaId')
      .getRawMany<{ empresaId: number }>();

    return filas.map((f) => f.empresaId);
  }
}