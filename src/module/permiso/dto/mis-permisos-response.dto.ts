import { ApiProperty } from '@nestjs/swagger';
import { TODOS_LOS_MODULOS_PERMISO } from '../enums/modulo-administrativo.enum';
import type { ModuloPermiso } from '../enums/modulo-administrativo.enum';

export class PermisoModuloResponseDto {
  @ApiProperty({ enum: TODOS_LOS_MODULOS_PERMISO })
  modulo!: ModuloPermiso;

  @ApiProperty()
  canRead!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canDelete!: boolean;

  @ApiProperty()
  canExport!: boolean;
}

export class MisPermisosResponseDto {
  @ApiProperty({
    description:
      'Rol de sistema: accede a todo sin consultar la matriz, por eso permisos viene vacío.',
  })
  esSistema!: boolean;

  @ApiProperty()
  rolNombre!: string;

  @ApiProperty({ type: [PermisoModuloResponseDto] })
  permisos!: PermisoModuloResponseDto[];
}
