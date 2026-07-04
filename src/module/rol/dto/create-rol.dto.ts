import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsPositive } from 'class-validator';

export class CreateRolDto {
  @ApiProperty({ example: 'Supervisor de calidad' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'Accede a módulos de calidad y reportes', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 1, description: 'ID de la empresa a la que pertenece el rol' })
  @IsInt()
  @IsPositive()
  empresaId!: number;
}