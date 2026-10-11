import { SetMetadata } from '@nestjs/common';
import { ModuloPermiso } from '../../module/permiso/enums/modulo-administrativo.enum';
import { PermissionAction } from '../enums/permission-action.enum';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (
  modulo: ModuloPermiso | ModuloPermiso[],
  action: PermissionAction,
) => SetMetadata(PERMISSIONS_KEY, { modulo, action });

export const AUTHENTICATED_ONLY_KEY = 'authenticatedOnly';
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_ONLY_KEY, true);