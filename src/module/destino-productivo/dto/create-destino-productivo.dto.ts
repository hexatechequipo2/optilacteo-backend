import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDestinoProductivoDto {
  @ApiProperty({
    example: 'Manteca',
    description: 'Nombre del destino productivo',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;
}