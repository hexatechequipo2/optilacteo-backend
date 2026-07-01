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
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @IsString()
  @MaxLength(200)
  razonSocial!: string;

  @IsNotEmpty({ message: 'El CUIT es obligatorio' })
  @Matches(/^\d{2}-\d{8}-\d{1}$/, {
    message: 'El CUIT debe tener el formato 20-00000000-0',
  })
  cuit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150)
  emailContacto?: string | null;

  @IsEnum(TipoProveedor, {
    message: `El tipo debe ser uno de: ${Object.values(TipoProveedor).join(', ')}`,
  })
  tipo!: TipoProveedor;

  // Obligatorio solo para admin (que gestiona cualquier empresa); para el
  // resto de los roles se ignora y se fuerza desde el JWT. Ver ProveedoresService.resolveEmpresaId.
  @IsOptional()
  @IsNumber({}, { message: 'El id de empresa debe ser un número' })
  empresaId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  localidad?: string | null;

  @IsOptional()
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(0)
  capacidad?: number;

  @IsOptional()
  @IsEnum(EstadoProveedor, {
    message: `El estado debe ser uno de: ${Object.values(EstadoProveedor).join(', ')}`,
  })
  estado?: EstadoProveedor;
}