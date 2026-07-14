import { Empresa } from '../entities/empresa.entity';
import { EmpresaModulo } from '../entities/empresa-modulo.entity';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { Plan } from '../enums/plan.enum';

export interface EmpresaFilters {
  name?: string;
  cuit?: string;
  email?: string;
  plan?: Plan;
  isActive?: boolean;
}

export interface IEmpresaRepository {
  findById(id: number): Promise<Empresa | null>;
  findByCuit(cuit: string): Promise<Empresa | null>;
  findAll(): Promise<Empresa[]>;
  findAllPaginated(
    skip: number,
    take: number,
    filters?: EmpresaFilters,
  ): Promise<[Empresa[], number]>;
  createEmpresa(empresa: Partial<Empresa>): Promise<Empresa>;
  updateEmpresa(id: number, empresa: Partial<Empresa>): Promise<Empresa>;
  deleteEmpresa(id: number): Promise<void>;
  hasActiveUsers(id: number): Promise<boolean>;
  createModulos(modulos: Partial<EmpresaModulo>[]): Promise<EmpresaModulo[]>;
  findModulo(empresaId: number, modulo: ModuloSistema): Promise<EmpresaModulo | null>;
  updateModulo(id: number, isActive: boolean): Promise<EmpresaModulo>;
  syncModulos(empresaId: number, modulosNuevoPlan: ModuloSistema[]): Promise<void>;
}

export const EMPRESA_REPOSITORY = 'EMPRESA_REPOSITORY';