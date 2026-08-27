import { Tambo } from '../entities/tambo.entity';

export const TAMBO_REPOSITORY = 'TAMBO_REPOSITORY';

export interface ITamboRepository {
  create(data: Partial<Tambo>): Tambo;
  save(tambo: Tambo): Promise<Tambo>;
  findById(id: number, empresaId: number): Promise<Tambo | null>;
  findAllByEmpresa(empresaId: number): Promise<Tambo[]>;
  // Usado por el select encadenado del form de carga de lote (HU-36)
  // y también por LoteService.create para validar el tambo de origen.
  findByProveedor(proveedorId: number, empresaId: number): Promise<Tambo[]>;
}