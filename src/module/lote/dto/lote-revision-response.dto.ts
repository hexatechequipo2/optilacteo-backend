import { ApiProperty } from '@nestjs/swagger';
import { DecisionRevision } from '../enums/decision-revision.enum';

export class LoteRevisionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  loteId!: number;

  @ApiProperty({ enum: DecisionRevision })
  decision!: DecisionRevision;

  @ApiProperty()
  justificacion!: string;

  @ApiProperty()
  usuarioId!: number;

  @ApiProperty()
  createdAt!: Date;
}