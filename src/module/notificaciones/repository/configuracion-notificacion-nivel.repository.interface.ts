import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

export const CONFIGURACION_NOTIFICACION_REPOSITORY =
  'CONFIGURACION_NOTIFICACION_REPOSITORY';

export interface IConfiguracionNotificacionRepository {
  findByEmpresa(empresaId: number): Promise<ConfiguracionNotificacionNivel[]>;

  findById(
    id: number,
    empresaId: number,
  ): Promise<ConfiguracionNotificacionNivel | null>;

  // Reemplaza a findRolIdsByNivel: devuelve ambas fuentes de destinatarios.
  findDestinatariosConfigByNivel(
    empresaId: number,
    nivelAlerta: NivelAlerta,
  ): Promise<{ rolIds: number[]; usuarioIds: number[] }>;

  countByNivel(empresaId: number, nivelAlerta: NivelAlerta): Promise<number>;

  create(
    config: Partial<ConfiguracionNotificacionNivel>,
  ): Promise<ConfiguracionNotificacionNivel>;

  delete(id: number, empresaId: number): Promise<boolean>;
}