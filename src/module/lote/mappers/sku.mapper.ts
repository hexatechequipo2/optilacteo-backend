import { Sku } from '../entities/sku.entity';
import { SkuResponseDto } from '../dto/sku-response.dto';

export class SkuMapper {
  static toResponseDto(sku: Sku): SkuResponseDto {
    return {
      id: sku.id,
      empresaId: sku.empresaId,
      nombre: sku.nombre,
      unidadMedida: sku.unidadMedida,
      activo: sku.activo,
      createdAt: sku.createdAt,
    };
  }

  static toResponseDtoList(skus: Sku[]): SkuResponseDto[] {
    return skus.map((s) => this.toResponseDto(s));
  }
}
