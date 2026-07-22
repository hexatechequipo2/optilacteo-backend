import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { CreateLoteParametroDto } from './create-lote-parametro.dto';

export class CreateLoteDto {
  @ApiPropertyOptional({
    description:
      'Identificador único del lote. Si no se envía, se genera automáticamente.',
  })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty()
  @IsInt()
  proveedorId!: number;

  @ApiProperty({ enum: TipoMateriaPrima })
  @IsEnum(TipoMateriaPrima)
  materiaPrima!: TipoMateriaPrima;

  @ApiProperty({ example: '2026-07-22T08:30:00.000Z' })
  @IsDateString()
  fechaIngreso!: string;

  @ApiPropertyOptional({ enum: ClasificacionLote })
  @IsOptional()
  @IsEnum(ClasificacionLote)
  clasificacion?: ClasificacionLote;

  @ApiPropertyOptional({ enum: DestinoLote })
  @IsOptional()
  @IsEnum(DestinoLote)
  destinoInicial?: DestinoLote;

  @ApiProperty({ type: [CreateLoteParametroDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLoteParametroDto)
  parametros!: CreateLoteParametroDto[];
}