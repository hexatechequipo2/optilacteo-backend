import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

export class CreateProveedorDto {
  @ApiProperty({
    description: 'Razón social del proveedor',
    example: 'Lácteos del Valle S.A.',
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @IsString()
  @MaxLength(200)
  razonSocial!: string;

  @ApiProperty({
    description: 'CUIT con formato XX-XXXXXXXX-X',
    example: '30-71234567-8',
  })
  @IsNotEmpty({ message: 'El CUIT es obligatorio' })
  @Matches(/^\d{2}-\d{8}-\d{1}$/, {
    message: 'El CUIT debe tener el formato 20-00000000-0',
  })
  cuit!: string;

  @ApiPropertyOptional({
    description: 'Teléfono de contacto',
    example: '+54 353 4567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @ApiPropertyOptional({
    description: 'Email de contacto',
    example: 'compras@lacteosdelvalle.com',
    maxLength: 150,
  })
  @IsOptional()
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150)
  emailContacto?: string | null;

  @ApiProperty({
    description: 'Tipo de proveedor',
    enum: TipoProveedor,
    example: TipoProveedor.TAMBO,
  })
  @IsEnum(TipoProveedor, {
    message: `El tipo debe ser uno de: ${Object.values(TipoProveedor).join(', ')}`,
  })
  tipo!: TipoProveedor;

  // Obligatorio solo para admin (que gestiona cualquier empresa); para el
  // resto de los roles se ignora y se fuerza desde el JWT. Ver ProveedoresService.resolveEmpresaId.
  @ApiPropertyOptional({
    description: 'Id de la empresa (obligatorio solo si el usuario es ADMINISTRADOR)',
    example: 2,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El id de empresa debe ser un número' })
  empresaId?: number;

  @ApiPropertyOptional({
    description: 'Provincia donde opera el proveedor',
    example: 'Córdoba',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string | null;

  @ApiPropertyOptional({
    description: 'Localidad donde opera el proveedor',
    example: 'Villa María',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  localidad?: string | null;

  @ApiPropertyOptional({
    description: 'Capacidad de producción/entrega',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(0)
  capacidad?: number;

  @ApiPropertyOptional({
    description: 'Estado comercial del proveedor',
    enum: EstadoProveedor,
    example: EstadoProveedor.ACTIVA,
  })
  @IsOptional()
  @IsEnum(EstadoProveedor, {
    message: `El estado debe ser uno de: ${Object.values(EstadoProveedor).join(', ')}`,
  })
  estado?: EstadoProveedor;
}