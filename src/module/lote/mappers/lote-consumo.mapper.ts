import { LoteConsumo } from '../entities/lote-consumo.entity';
import { LoteProduccion } from '../entities/lote-produccion.entity';
import { LoteConsumoResponseDto } from '../dto/lote-consumo-response.dto';
import { UnidadCantidad } from '../enums/unidad-cantidad.enum';

export class LoteConsumoMapper {
  static toResponseDto(
    consumo: LoteConsumo,
    loteProduccionCodigo: string,
    unidadCantidad?: UnidadCantidad | null,
  ): LoteConsumoResponseDto {
    return {
      id: consumo.id,
      loteIngresoId: consumo.loteIngresoId,
      loteProduccionId: consumo.loteProduccionId,
      loteProduccionCodigo,
      cantidad: Number(consumo.cantidad),
      unidadCantidad: unidadCantidad ?? null,
      usuarioId: consumo.usuarioId,
      parametros: (consumo.parametros ?? []).map((p) => ({
        parametro: p.parametro,
        valor: Number(p.valor),
      })),
      createdAt: consumo.createdAt,
    };
  }

  static toResponseDtoList(
    consumos: LoteConsumo[],
    getCodigo: (loteProduccion: LoteProduccion) => string = (lp) => lp.codigo,
    unidadCantidad?: UnidadCantidad | null,
  ): LoteConsumoResponseDto[] {
    return consumos.map((c) =>
      this.toResponseDto(
        c,
        c.loteProduccion ? getCodigo(c.loteProduccion) : '',
        unidadCantidad,
      ),
    );
  }
}