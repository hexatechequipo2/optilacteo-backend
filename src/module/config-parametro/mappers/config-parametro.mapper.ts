import { ConfiguracionParametro } from '../entities/config-parametro.entity';
import { CreateConfigParametroDto } from '../dto/create-config-parametro.dto';
import { ConfigParametroResponseDto } from '../dto/config-parametro-response.dto';

export class ConfigParametroMapper {
  static toEntity(
    dto: CreateConfigParametroDto,
    empresaId: number,
  ): ConfiguracionParametro {
    const entity = new ConfiguracionParametro();
    entity.empresaId = empresaId;
    entity.parametro = dto.parametro;
    entity.tipoMateriaPrima = dto.tipoMateriaPrima;
    entity.umbralAlertaMin = dto.umbralAlertaMin;
    entity.umbralMin = dto.umbralMin;
    entity.umbralMax = dto.umbralMax;
    entity.umbralAlertaMax = dto.umbralAlertaMax;
    return entity;
  }

  static toResponse(
    entity: ConfiguracionParametro,
  ): ConfigParametroResponseDto {
    const dto = new ConfigParametroResponseDto();
    dto.id = entity.id;
    dto.empresaId = entity.empresaId;
    dto.parametro = entity.parametro;
    dto.tipoMateriaPrima = entity.tipoMateriaPrima;
    dto.umbralAlertaMin = Number(entity.umbralAlertaMin);
    dto.umbralMin = Number(entity.umbralMin);
    dto.umbralMax = Number(entity.umbralMax);
    dto.umbralAlertaMax = Number(entity.umbralAlertaMax);
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
