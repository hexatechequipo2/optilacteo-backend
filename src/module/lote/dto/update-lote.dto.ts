import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateLoteDto } from './create-lote.dto';
import { DestinoLote } from '../enums/destino-lote.enum';

// No permite editar el código (identificador único), el proveedor ni la
// clasificación de un lote ya registrado (HU-76: la clasificación cambia solo
// por evaluación automática o por revisión de calidad).
export class UpdateLoteDto extends PartialType(CreateLoteDto) {
  @ApiPropertyOptional({ enum: DestinoLote })
  @IsOptional()
  @IsEnum(DestinoLote)
  destinoInicial?: DestinoLote;
}