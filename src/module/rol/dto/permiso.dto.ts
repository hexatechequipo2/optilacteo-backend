import { IsBoolean, IsIn } from 'class-validator';
import { TODOS_LOS_MODULOS_PERMISO } from '../../permiso/enums/modulo-administrativo.enum';
import type { ModuloPermiso } from '../../permiso/enums/modulo-administrativo.enum';
import type { FlagsPermiso } from '../../permiso/mappers/permiso-flags';

export class PermisoDto implements FlagsPermiso {
  @IsIn(TODOS_LOS_MODULOS_PERMISO) modulo!: ModuloPermiso;
  @IsBoolean() canRead!: boolean;
  @IsBoolean() canCreate!: boolean;
  @IsBoolean() canUpdate!: boolean;
  @IsBoolean() canDelete!: boolean;
  @IsBoolean() canExport!: boolean;
}