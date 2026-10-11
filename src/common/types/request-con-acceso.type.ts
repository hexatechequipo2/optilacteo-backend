import type { AuthenticatedRequest } from '../../module/auth/guards/jwt-auth.guard';
import type { AccesoUsuario } from '../../module/permiso/permiso.service';

export type RequestConAcceso = AuthenticatedRequest & { acceso?: AccesoUsuario };