import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoliticaRetencion } from '../entities/politica-retencion.entity';
import { IPoliticaRetencionRepository } from './politica-retencion.repository.interface';

@Injectable()
export class PoliticaRetencionRepository implements IPoliticaRetencionRepository {
  constructor(
    @InjectRepository(PoliticaRetencion)
    private readonly repository: Repository<PoliticaRetencion>,
  ) {}

  findByEmpresa(empresaId: number): Promise<PoliticaRetencion | null> {
    return this.repository.findOne({ where: { empresaId } });
  }

  create(data: Partial<PoliticaRetencion>): PoliticaRetencion {
    return this.repository.create(data);
  }

  save(entity: PoliticaRetencion): Promise<PoliticaRetencion> {
    return this.repository.save(entity);
  }
}