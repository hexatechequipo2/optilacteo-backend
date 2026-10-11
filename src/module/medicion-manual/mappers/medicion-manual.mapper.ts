import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { MedicionManualItemResponseDto } from '../dto/medicion-manual-lote-response.dto';
import { SemaforoService } from '../../config-parametro/semaforo.service';

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

  // HU-40: el estado (NORMAL / EN_LIMITE / FUERA_DE_RANGO /
  // SIN_UMBRAL_CONFIGURADO) ahora lo calcula SemaforoService, la misma
  // lógica que usan lectura-sensor y dashboard. AC5/6: fuera de rango se
  // marca, no se rechaza — este cálculo es puramente informativo.
  static toResponseItem(
    entity: MedicionManualLote,
    config: ConfiguracionParametro | undefined,
    semaforoService: SemaforoService,
  ): MedicionManualItemResponseDto {
    const dto = new MedicionManualItemResponseDto();
    dto.id = entity.id;
    dto.parametro = entity.parametro;
    dto.valor = Number(entity.valor);
    dto.estado = semaforoService.calcularEstado(dto.valor, config);
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static toResponseItemList(
    entities: MedicionManualLote[],
    mapaConfig: Map<string, ConfiguracionParametro>,
    semaforoService: SemaforoService,
  ): MedicionManualItemResponseDto[] {
    return entities.map((e) =>
      this.toResponseItem(
        e,
        mapaConfig.get(`${e.parametro}|${e.tipoMateriaPrima}`),
        semaforoService,
      ),
    );
  }
}