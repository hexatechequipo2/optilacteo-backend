import { ConfiguracionComparacionHistorica } from '../entities/configuracion-comparacion-historica.entity';

export const CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY =
  'CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY';

export interface IConfiguracionComparacionHistoricaRepository {
  findByEmpresa(empresaId: number): Promise<ConfiguracionComparacionHistorica | null>;
}