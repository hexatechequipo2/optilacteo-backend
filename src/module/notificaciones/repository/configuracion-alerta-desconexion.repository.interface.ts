import { ConfiguracionAlertaDesconexion } from '../entities/configuracion-alerta-desconexion.entity';

export interface IConfiguracionAlertaDesconexionRepository {
  findByEmpresa(empresaId: number): Promise<ConfiguracionAlertaDesconexion | null>;
  save(config: ConfiguracionAlertaDesconexion): Promise<ConfiguracionAlertaDesconexion>;
}

export const CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY =
  'IConfiguracionAlertaDesconexionRepository';