import { SystemConfig } from '../entities/system-config.entity';

export interface ISystemConfigRepository {
  findConfig(): Promise<SystemConfig | null>;
  updateConfig(data: Partial<SystemConfig>): Promise<SystemConfig>;
}

export const SYSTEM_CONFIG_REPOSITORY = 'SYSTEM_CONFIG_REPOSITORY';
