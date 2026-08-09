import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { MedicionManualItemResponseDto } from '../dto/medicion-manual-lote-response.dto';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';

export class MedicionManualMapper {
  // Construye una entidad por cada parámetro del DTO. No persiste (eso lo
  // hace el repository); separa "armar el objeto" de "guardarlo".
  static toEntities(
    dto: CreateMedicionManualLoteDto,
    loteId: number,
    empresaId: number,
    usuarioId: number,
  ): Partial<MedicionManualLote>[] {
    return dto.parametros.map((p) => ({
      loteId,
      empresaId,
      usuarioId,
      tipoMateriaPrima: dto.tipoMateriaPrima,
      parametro: p.parametro,
      valor: p.valor,
    }));
  }

  // Calcula el estado (NORMAL / FUERA_DE_RANGO / SIN_UMBRAL_CONFIGURADO)
  // comparando contra la config de rango correspondiente al parametro +
  // tipoMateriaPrima de la medición. AC5/6: fuera de rango se marca, no se
  // rechaza — este cálculo es puramente informativo para el historial.
  static toResponseItem(
    entity: MedicionManualLote,
    config: ConfiguracionParametro | undefined,
  ): MedicionManualItemResponseDto {
    const dto = new MedicionManualItemResponseDto();
    dto.id = entity.id;
    dto.parametro = entity.parametro;
    dto.valor = Number(entity.valor);
    dto.estado = this.calcularEstado(dto.valor, config);
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static toResponseItemList(
    entities: MedicionManualLote[],
    mapaConfig: Map<string, ConfiguracionParametro>,
  ): MedicionManualItemResponseDto[] {
    return entities.map((e) =>
      this.toResponseItem(
        e,
        mapaConfig.get(`${e.parametro}|${e.tipoMateriaPrima}`),
      ),
    );
  }

  private static calcularEstado(
    valor: number,
    config: ConfiguracionParametro | undefined,
  ): EstadoMedicion {
    if (!config) return EstadoMedicion.SIN_UMBRAL_CONFIGURADO;
    if (valor < config.umbralMin || valor > config.umbralMax) {
      return EstadoMedicion.FUERA_DE_RANGO;
    }
    return EstadoMedicion.NORMAL;
  }
}
