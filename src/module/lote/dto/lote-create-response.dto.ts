import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoteResponseDto } from './lote-response.dto';
import { SensorResponseDto } from '../../sensor/dto/sensor-response.dto';
import { RecomendacionResponseDto } from '../../ml/dto/recomendacion-response.dto';

export class LoteCreateResponseDto {
  @ApiProperty({ type: LoteResponseDto })
  lote!: LoteResponseDto;

  @ApiProperty({ type: [SensorResponseDto] })
  sensoresDisponibles!: SensorResponseDto[];

  // HU-49 AC1/AC3: null cuando la empresa todavía no tiene historial
  // suficiente para que el modelo recomiende (no es un error).
  @ApiPropertyOptional({ type: RecomendacionResponseDto, nullable: true })
  recomendacion?: RecomendacionResponseDto | null;
}