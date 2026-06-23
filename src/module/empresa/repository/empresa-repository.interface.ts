import { Empresa } from '../entities/empresa.entity';

export interface IEmpresaRepository {
  findById(id: number): Promise<Empresa | null>;
  findAll(): Promise<Empresa[]>;
  createEmpresa(empresa: Partial<Empresa>): Promise<Empresa>;
  updateEmpresa(id: number, empresa: Partial<Empresa>): Promise<Empresa>;
  deleteEmpresa(id: number): Promise<void>;
  hasActiveUsers(id: number): Promise<boolean>;
}

export const EMPRESA_REPOSITORY = 'EMPRESA_REPOSITORY';