import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { MedicionManualParametroItemDto } from './medicion-manual-parametro-item.dto';

export class CreateMedicionManualLoteDto {
  @ApiProperty({ enum: TipoMateriaPrima })
  @IsEnum(TipoMateriaPrima, { message: 'tipoMateriaPrima inválido' })
  tipoMateriaPrima!: TipoMateriaPrima;

  @ApiProperty({ type: [MedicionManualParametroItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicionManualParametroItemDto)
  parametros!: MedicionManualParametroItemDto[];
}