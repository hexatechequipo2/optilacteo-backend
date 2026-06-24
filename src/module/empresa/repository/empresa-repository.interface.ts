import { Empresa } from '../entities/empresa.entity';
import { EmpresaModulo } from '../entities/empresa-modulo.entity';
import { ModuloSistema } from '../enums/modulo-sistema.enum';

export interface IEmpresaRepository {
  findById(id: number): Promise<Empresa | null>;
  findAll(): Promise<Empresa[]>;
  createEmpresa(empresa: Partial<Empresa>): Promise<Empresa>;
  updateEmpresa(id: number, empresa: Partial<Empresa>): Promise<Empresa>;
  deleteEmpresa(id: number): Promise<void>;
  hasActiveUsers(id: number): Promise<boolean>;
  createModulos(modulos: Partial<EmpresaModulo>[]): Promise<EmpresaModulo[]>;
  findModulo(empresaId: number, modulo: ModuloSistema): Promise<EmpresaModulo | null>;
  updateModulo(id: number, isActive: boolean): Promise<EmpresaModulo>;
}

export const EMPRESA_REPOSITORY = 'EMPRESA_REPOSITORY';