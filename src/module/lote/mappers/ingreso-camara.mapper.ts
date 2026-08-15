import { IngresoCamara } from '../entities/ingreso-camara.entity';
import { IngresoCamaraResponseDto } from '../dto/ingreso-camara-response.dto';

export class IngresoCamaraMapper {
  static toResponseDto(ingreso: IngresoCamara): IngresoCamaraResponseDto {
    return {
      id: ingreso.id,
      empresaId: ingreso.empresaId,
      skuId: ingreso.skuId,
      skuNombre: ingreso.sku?.nombre,
      cantidad: Number(ingreso.cantidad),
      loteId: ingreso.loteId ?? null,
      loteCodigo: ingreso.lote?.codigo ?? null,
      fechaIngreso: ingreso.fechaIngreso,
      createdAt: ingreso.createdAt,
    };
  }

  static toResponseDtoList(ingresos: IngresoCamara[]): IngresoCamaraResponseDto[] {
    return ingresos.map((i) => this.toResponseDto(i));
  }
}