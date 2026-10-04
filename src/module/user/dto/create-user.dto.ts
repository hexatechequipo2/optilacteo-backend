import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DESCRIPCION_EMPRESA_ID } from '../../../common/tenant/empresa-objetivo';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'admin@optilacteo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strongPassword' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 2, description: 'ID del rol' })
  @IsInt()
  @IsPositive()
  rolId!: number;

  @ApiPropertyOptional({ example: 1, description: DESCRIPCION_EMPRESA_ID })
  @IsOptional()
  @IsInt()
  @IsPositive()
  empresaId?: number;
}
