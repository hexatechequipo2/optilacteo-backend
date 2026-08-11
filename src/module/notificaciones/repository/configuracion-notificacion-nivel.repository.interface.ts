import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

export const CONFIGURACION_NOTIFICACION_REPOSITORY =
  'CONFIGURACION_NOTIFICACION_REPOSITORY';

export interface IConfiguracionNotificacionRepository {
  findByEmpresa(empresaId: number): Promise<ConfiguracionNotificacionNivel[]>;

  findRolIdsByNivel(
    empresaId: number,
    nivelAlerta: NivelAlerta,
  ): Promise<number[]>;

  create(
    config: Partial<ConfiguracionNotificacionNivel>,
  ): Promise<ConfiguracionNotificacionNivel>;

  delete(id: number, empresaId: number): Promise<boolean>;
}