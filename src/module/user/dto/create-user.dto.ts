import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsInt,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 1, description: 'ID de la empresa' })
  @IsInt()
  @IsPositive()
  empresaId!: number;
}