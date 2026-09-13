import { ConfiguracionSilencioAlerta } from '../entities/configuracion-silencio-alerta.entity';

export const CONFIGURACION_SILENCIO_REPOSITORY =
  'CONFIGURACION_SILENCIO_REPOSITORY';

export interface IConfiguracionSilencioRepository {
  findByEmpresa(empresaId: number): Promise<ConfiguracionSilencioAlerta[]>;

  findById(
    id: number,
    empresaId: number,
  ): Promise<ConfiguracionSilencioAlerta | null>;

  create(
    data: Partial<ConfiguracionSilencioAlerta>,
  ): Promise<ConfiguracionSilencioAlerta>;

  update(
    id: number,
    empresaId: number,
    data: Partial<ConfiguracionSilencioAlerta>,
  ): Promise<ConfiguracionSilencioAlerta | null>;

  delete(id: number, empresaId: number): Promise<boolean>;
}