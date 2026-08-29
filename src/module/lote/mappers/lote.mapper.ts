import { Lote } from '../entities/lote.entity';
import { LoteResponseDto } from '../dto/lote-response.dto';
import { DesvioProveedorResponseDto } from '../dto/desvio-proveedor-response.dto';

export class LoteMapper {
  static toResponseDto(lote: Lote): LoteResponseDto {
    return {
      id: lote.id,
      codigo: lote.codigo,
      empresaId: lote.empresaId,
      proveedorId: lote.proveedorId,
      tamboId: lote.tamboId, // <-- NUEVO (HU-36)
      materiaPrima: lote.materiaPrima,
      fechaIngreso: lote.fechaIngreso,
      clasificacion: lote.clasificacion ?? null,
      destinoInicial: lote.destinoInicial ?? null,
      ubicacionInicial: lote.ubicacionInicial ?? null,
      estado: lote.estado,
      rendimiento: lote.rendimiento != null ? Number(lote.rendimiento) : null,
      unidadRendimiento: lote.unidadRendimiento ?? null,
      cantidad: lote.cantidad != null ? Number(lote.cantidad) : null,
      cantidadDisponible:
        lote.cantidadDisponible != null
          ? Number(lote.cantidadDisponible)
          : null,
      // HU-66
      cantidadComprometidaKg:
        lote.cantidadComprometidaKg != null
          ? Number(lote.cantidadComprometidaKg)
          : null,
      parametros: (lote.parametros ?? []).map((p) => ({
        parametro: p.parametro,
        valor: Number(p.valor),
        valorComprometido:
          p.valorComprometido != null ? Number(p.valorComprometido) : null,
      })),
      createdAt: lote.createdAt,
    };
  }

  static toResponseDtoList(lotes: Lote[]): LoteResponseDto[] {
    return lotes.map((lote) => this.toResponseDto(lote));
  }

  // HU-66
  static toDesvioResponseDto(lote: Lote): DesvioProveedorResponseDto {
    const cantidadComprometida =
      lote.cantidadComprometidaKg != null
        ? Number(lote.cantidadComprometidaKg)
        : null;
    const cantidadReal = lote.cantidad != null ? Number(lote.cantidad) : null;

    return {
      loteId: lote.id,
      codigo: lote.codigo,
      fechaIngreso: lote.fechaIngreso,
      cantidadComprometidaKg: cantidadComprometida,
      cantidadReal,
      desvioCantidadPorcentaje: this.calcularDesvio(
        cantidadComprometida,
        cantidadReal,
      ),
      parametros: (lote.parametros ?? [])
        .filter((p) => p.valorComprometido != null)
        .map((p) => {
          const comprometido = Number(p.valorComprometido);
          const real = Number(p.valor);
          return {
            parametro: p.parametro,
            valorComprometido: comprometido,
            valorReal: real,
            desvioPorcentaje: this.calcularDesvio(comprometido, real) ?? 0,
          };
        }),
    };
  }

  static toDesvioResponseDtoList(lotes: Lote[]): DesvioProveedorResponseDto[] {
    return lotes.map((lote) => this.toDesvioResponseDto(lote));
  }

  private static calcularDesvio(
    comprometido: number | null,
    real: number | null,
  ): number | null {
    if (comprometido == null || real == null || comprometido === 0) return null;
    return Math.round(((real - comprometido) / comprometido) * 10000) / 100; // 2 decimales
  }
}
