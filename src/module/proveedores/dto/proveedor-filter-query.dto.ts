import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';

export class ProveedorFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TipoProveedor)
  tipo?: TipoProveedor;

  @IsOptional()
  @IsString()
  search?: string;
}