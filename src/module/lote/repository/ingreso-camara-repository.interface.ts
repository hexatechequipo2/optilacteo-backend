import { IngresoCamara } from '../entities/ingreso-camara.entity';
import { IngresoCamaraFilterQueryDto } from '../dto/ingreso-camara-filter-query.dto';

export const INGRESO_CAMARA_REPOSITORY = 'INGRESO_CAMARA_REPOSITORY';

export interface IIngresoCamaraRepository {
  create(data: Partial<IngresoCamara>): IngresoCamara;
  save(ingreso: IngresoCamara): Promise<IngresoCamara>;
  findById(id: number, empresaId: number): Promise<IngresoCamara | null>;
  findAll(
    query: IngresoCamaraFilterQueryDto,
    empresaId: number,
  ): Promise<[IngresoCamara[], number]>;
}