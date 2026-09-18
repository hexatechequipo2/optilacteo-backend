import { ConfiguracionSilencioAlerta } from '../entities/configuracion-silencio-alerta.entity';
import { ConfiguracionSilencioResponseDto } from '../dto/configuracion-silencio-response.dto';

export class ConfiguracionSilencioMapper {
  static toResponse(
    config: ConfiguracionSilencioAlerta,
  ): ConfiguracionSilencioResponseDto {
    return {
      id: config.id,
      nombre: config.nombre ?? null,
      horaInicio: config.horaInicio,
      horaFin: config.horaFin,
      diasSemana: config.diasSemana ?? null,
      empresaId: config.empresaId,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  static toResponseList(
    configs: ConfiguracionSilencioAlerta[],
  ): ConfiguracionSilencioResponseDto[] {
    return configs.map((c) => this.toResponse(c));
  }
}