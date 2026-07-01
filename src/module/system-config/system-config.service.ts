import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ISystemConfigRepository } from './repository/system-config-repository.interface';
import { SYSTEM_CONFIG_REPOSITORY } from './repository/system-config-repository.interface';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@Injectable()
export class SystemConfigService {
  constructor(
    @Inject(SYSTEM_CONFIG_REPOSITORY)
    private readonly systemConfigRepository: ISystemConfigRepository,
  ) {}

  async getConfig() {
    const config = await this.systemConfigRepository.findConfig();
    if (!config) {
      throw new NotFoundException('Configuracion del sistema no encontrada');
    }
    return config;
  }

  async updateInactivityTimeout(dto: UpdateSystemConfigDto) {
    await this.getConfig();
    return this.systemConfigRepository.updateConfig({
      inactivityTimeout: dto.inactivityTimeout,
    });
  }
}
