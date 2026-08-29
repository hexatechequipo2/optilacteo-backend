import { PlcConfig } from '../entities/plc-config.entity';
import { PlcConfigResponseDto } from '../dto/plc-config-response.dto';

export class PlcConfigMapper {
  static toResponseDto(
    config: PlcConfig | null,
    requierePlc: boolean,
  ): PlcConfigResponseDto {
    return {
      url: config?.url ?? null,
      requierePlc,
    };
  }
}
