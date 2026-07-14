import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Plan } from '../enums/plan.enum';

export class CreateEmpresaDto {
  @ApiProperty({ example: 'Optilacteo S.A.' })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiProperty({ example: '30-12345678-9' })
  @IsNotEmpty({ message: 'El CUIT es obligatorio' })
  @Matches(/^\d{2}-\d{8}-\d{1}$/, {
    message: 'El CUIT debe tener el formato 20-00000000-0',
  })
  cuit!: string;

  @ApiProperty({ example: 'contacto@optilacteo.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+54 351 1234567', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'Av. Siempreviva 742, Córdoba', required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ example: 'starter', enum: Plan, default: Plan.STARTER })
  @IsEnum(Plan)
  plan: Plan = Plan.STARTER;
}