import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateIdentidadEmpresaDto {
  @ApiProperty({ example: 'Optilacteo S.A.' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa no puede estar vacío' })
  name!: string;
}