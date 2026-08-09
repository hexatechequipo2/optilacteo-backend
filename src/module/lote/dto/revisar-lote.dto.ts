import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DecisionRevision } from '../enums/decision-revision.enum';

export class RevisarLoteDto {
  @ApiProperty({ enum: DecisionRevision })
  @IsEnum(DecisionRevision)
  decision!: DecisionRevision;

  @ApiProperty({
    example: 'Parámetros dentro de tolerancia aceptable según norma X',
  })
  @IsString()
  @IsNotEmpty({ message: 'La justificación es obligatoria' })
  @MinLength(10, {
    message: 'La justificación debe ser suficientemente descriptiva',
  })
  justificacion!: string;
}
