import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsInt, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DESCRIPCION_EMPRESA_ID } from '../../../common/tenant/empresa-objetivo';

// Sin rolId: el rol se cambia solo por PUT /roles/usuarios/:usuarioId.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['rolId'] as const),
) {
  // Elige la empresa del usuario a editar; no lo mueve de empresa.
  @ApiPropertyOptional({ example: 1, description: DESCRIPCION_EMPRESA_ID })
  @IsOptional()
  @IsInt()
  @IsPositive()
  empresaId?: number;
}
