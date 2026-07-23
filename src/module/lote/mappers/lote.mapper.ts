import { Lote } from '../entities/lote.entity';
import { LoteResponseDto } from '../dto/lote-response.dto';

export class LoteMapper {
  static toResponseDto(lote: Lote): LoteResponseDto {
    return {
      id: lote.id,
      codigo: lote.codigo,
      empresaId: lote.empresaId,
      proveedorId: lote.proveedorId,
      materiaPrima: lote.materiaPrima,
      fechaIngreso: lote.fechaIngreso,
      clasificacion: lote.clasificacion ?? null,
      destinoInicial: lote.destinoInicial ?? null,
      ubicacionInicial: lote.ubicacionInicial ?? null,
      estado: lote.estado,
      parametros: (lote.parametros ?? []).map((p) => ({
        parametro: p.parametro,
        valor: Number(p.valor),
      })),
      createdAt: lote.createdAt,
    };
  }

  static toResponseDtoList(lotes: Lote[]): LoteResponseDto[] {
    return lotes.map((lote) => this.toResponseDto(lote));
  }
}