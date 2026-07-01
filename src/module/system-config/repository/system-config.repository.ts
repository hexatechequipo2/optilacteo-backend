import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import { ISystemConfigRepository } from './system-config-repository.interface';

@Injectable()
export class SystemConfigRepository implements ISystemConfigRepository {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repository: Repository<SystemConfig>,
  ) {}

  async findConfig(): Promise<SystemConfig | null> {
    return this.repository.findOne({ where: { id: 1 } });
  }

  async updateConfig(data: Partial<SystemConfig>): Promise<SystemConfig> {
    await this.repository.update(1, data);
    return this.repository.findOne({
      where: { id: 1 },
    }) as Promise<SystemConfig>;
  }
}
