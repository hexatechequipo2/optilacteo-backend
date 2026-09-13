import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfiguracionSilencioResponseDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  nombre?: string | null;

  @ApiProperty()
  horaInicio!: string;

  @ApiProperty()
  horaFin!: string;

  @ApiPropertyOptional({ type: [Number] })
  diasSemana?: number[] | null;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}