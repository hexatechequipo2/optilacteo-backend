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
  IsNumber,
  IsPositive,
} from 'class-validator';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { Ubicacion } from '../../sensor/enums/ubicacion.enum';
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

  @ApiPropertyOptional({ enum: DestinoLote })
  @IsOptional()
  @IsEnum(DestinoLote)
  destinoInicial?: DestinoLote;

  @ApiPropertyOptional({ enum: Ubicacion })
  @IsOptional()
  @IsEnum(Ubicacion)
  ubicacionInicial?: Ubicacion;

  @ApiProperty({ type: [CreateLoteParametroDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLoteParametroDto)
  parametros!: CreateLoteParametroDto[];

  @ApiProperty({ example: 500, description: 'Cantidad total ingresada del lote' })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  // HU-66: cantidad comprometida según remito del proveedor. Opcional (AC4) —
  // puede no estar disponible al momento de la carga si aún no llegó el remito.
  @ApiPropertyOptional({
    example: 500,
    description: 'Cantidad comprometida según remito del proveedor',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cantidadComprometidaKg?: number;
}