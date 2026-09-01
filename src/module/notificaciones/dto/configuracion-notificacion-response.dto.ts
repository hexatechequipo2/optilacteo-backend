import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { UsuarioResumenDto } from './usuario-resumen.dto';

export class RolResumenDto {
  id!: number;
  nombre!: string;
}

export class ConfiguracionNotificacionResponseDto {
  id!: number;
  nivelAlerta!: NivelAlerta;
  rolId!: number | null;
  rol!: RolResumenDto | null;
  usuarioId!: number | null;
  usuario!: UsuarioResumenDto | null;
  empresaId!: number;
  createdAt!: Date;
}
