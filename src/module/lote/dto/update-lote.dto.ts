import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateLoteDto } from './create-lote.dto';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';

// No permite editar el código (identificador único) ni el proveedor de un lote ya registrado.
export class UpdateLoteDto extends PartialType(CreateLoteDto) {
  @ApiPropertyOptional({ enum: ClasificacionLote })
  @IsOptional()
  @IsEnum(ClasificacionLote)
  clasificacion?: ClasificacionLote;

  @ApiPropertyOptional({ enum: DestinoLote })
  @IsOptional()
  @IsEnum(DestinoLote)
  destinoInicial?: DestinoLote;
}