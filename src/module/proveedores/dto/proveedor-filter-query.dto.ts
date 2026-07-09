import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

export class ProveedorFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  cuit?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  emailContacto?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  localidad?: string;

  @IsOptional()
  @IsEnum(TipoProveedor)
  tipo?: TipoProveedor;

  @IsOptional()
  @IsEnum(EstadoProveedor)
  estado?: EstadoProveedor;
}