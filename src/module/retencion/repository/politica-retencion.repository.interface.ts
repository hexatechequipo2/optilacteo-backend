import { PoliticaRetencion } from '../entities/politica-retencion.entity';

export const POLITICA_RETENCION_REPOSITORY = 'POLITICA_RETENCION_REPOSITORY';

export interface IPoliticaRetencionRepository {
  findByEmpresa(empresaId: number): Promise<PoliticaRetencion | null>;
  create(data: Partial<PoliticaRetencion>): PoliticaRetencion;
  save(entity: PoliticaRetencion): Promise<PoliticaRetencion>;
}