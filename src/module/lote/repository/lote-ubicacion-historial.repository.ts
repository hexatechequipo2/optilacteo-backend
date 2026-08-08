import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoteUbicacionHistorial } from '../entities/lote-ubicacion-historial.entity';
import { ILoteUbicacionHistorialRepository } from './lote-ubicacion-historial.repository.interface';

@Injectable()
export class LoteUbicacionHistorialRepository implements ILoteUbicacionHistorialRepository {
  constructor(
    @InjectRepository(LoteUbicacionHistorial)
    private readonly repo: Repository<LoteUbicacionHistorial>,
  ) {}

  create(registro: LoteUbicacionHistorial): Promise<LoteUbicacionHistorial> {
    return this.repo.save(registro);
  }

  findUltimoPorLote(loteId: number, empresaId: number): Promise<LoteUbicacionHistorial | null> {
    return this.repo.findOne({
      where: { loteId, empresaId },
      order: { fecha: 'DESC' },
    });
  }
}