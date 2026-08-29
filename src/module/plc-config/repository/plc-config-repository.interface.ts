import { PlcConfig } from '../entities/plc-config.entity';

export const PLC_CONFIG_REPOSITORY = Symbol('PLC_CONFIG_REPOSITORY');

export interface IPlcConfigRepository {
  findByEmpresa(empresaId: number): Promise<PlcConfig | null>;
  create(entity: PlcConfig): Promise<PlcConfig>;
  save(entity: PlcConfig): Promise<PlcConfig>;
  existsSensorDigitalOAnalogico(empresaId: number): Promise<boolean>;
}
