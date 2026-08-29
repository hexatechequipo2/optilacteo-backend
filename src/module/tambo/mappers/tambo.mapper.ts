import { Tambo } from '../entities/tambo.entity';
import { TamboResponseDto } from '../dto/tambo-response.dto';

export class TamboMapper {
  static toResponseDto(tambo: Tambo): TamboResponseDto {
    return {
      id: tambo.id,
      nombre: tambo.nombre,
      ubicacion: tambo.ubicacion ?? null,
      activo: tambo.activo,
      empresaId: tambo.empresaId,
      proveedorId: tambo.proveedorId,
      createdAt: tambo.createdAt,
    };
  }

  static toResponseDtoList(tambos: Tambo[]): TamboResponseDto[] {
    return tambos.map((tambo) => this.toResponseDto(tambo));
  }
}
