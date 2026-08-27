import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTamboDto {
  @ApiProperty({ example: 'Tambo La Esperanza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Ruta 6 km 12, Cañuelas' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ubicacion?: string;

  @ApiProperty({ description: 'Proveedor al que pertenece el tambo' })
  @IsInt()
  proveedorId!: number;
}