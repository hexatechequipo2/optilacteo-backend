import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (
  modulo: string | string[],
  action: 'canRead' | 'canWrite',
) => SetMetadata(PERMISSIONS_KEY, { modulo, action });
