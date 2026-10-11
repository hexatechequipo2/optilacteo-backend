import { Type } from 'class-transformer';
import {
  IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested,
} from 'class-validator';
import { PermisoDto } from './permiso.dto';

export class GuardarRolDto {
  @IsString() @MinLength(3) @MaxLength(60)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(255)
  descripcion?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => PermisoDto)
  permisos!: PermisoDto[];
}