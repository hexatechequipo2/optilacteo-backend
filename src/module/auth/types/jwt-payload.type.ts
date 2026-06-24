import { Role } from '../../user/enums/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  tenant_id?: string;
  jti: string;
  exp?: number;
}
