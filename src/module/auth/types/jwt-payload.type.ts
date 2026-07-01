import { Role } from '../../user/enums/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  empresaId: number | null;
  jti: string;
  exp?: number;
}
