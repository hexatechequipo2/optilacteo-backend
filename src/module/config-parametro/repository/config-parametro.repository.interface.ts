import { ConfiguracionParametro } from '../entities/config-parametro.entity';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';

export const CONFIG_PARAMETRO_REPOSITORY = 'CONFIG_PARAMETRO_REPOSITORY';

export interface IConfigParametroRepository {
  save(
    config: ConfiguracionParametro,
  ): Promise<ConfiguracionParametro>;

  findById(
    id: number,
  ): Promise<ConfiguracionParametro | null>;

  findByEmpresa(
    empresaId: number,
  ): Promise<ConfiguracionParametro[]>;

  findByParametroAndTipoMateriaPrima(
    empresaId: number,
    parametro: Parametro,
    tipoMateriaPrima: TipoMateriaPrima,
  ): Promise<ConfiguracionParametro | null>;

  delete(id: number): Promise<void>;
}