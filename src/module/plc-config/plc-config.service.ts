import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { IPlcConfigRepository } from './repository/plc-config-repository.interface';
import { PLC_CONFIG_REPOSITORY } from './repository/plc-config-repository.interface';
import { PlcConfig } from './entities/plc-config.entity';
import { UpdatePlcConfigDto } from './dto/update-plc-config.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import type {
  PlcConfigResponseDto,
  TestConnectionResponseDto,
} from './dto/plc-config-response.dto';
import { PlcConfigMapper } from './mappers/plc-config.mapper';
import type { TenantContext } from '../../common/types/tenant-context.type';

const TIMEOUT_MS = 4000;

@Injectable()
export class PlcConfigService {
  private readonly logger = new Logger(PlcConfigService.name);

  constructor(
    @Inject(PLC_CONFIG_REPOSITORY)
    private readonly plcConfigRepository: IPlcConfigRepository,
  ) {}

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  async obtenerConfig(tenant: TenantContext): Promise<PlcConfigResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const [config, requierePlc] = await Promise.all([
      this.plcConfigRepository.findByEmpresa(empresaId),
      this.plcConfigRepository.existsSensorDigitalOAnalogico(empresaId),
    ]);

    return PlcConfigMapper.toResponseDto(config, requierePlc);
  }

  async guardarUrl(
    dto: UpdatePlcConfigDto,
    tenant: TenantContext,
  ): Promise<PlcConfigResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const existente = await this.plcConfigRepository.findByEmpresa(empresaId);
    let guardado: PlcConfig;

    if (existente) {
      existente.url = dto.url;
      guardado = await this.plcConfigRepository.save(existente);
    } else {
      const nuevo = new PlcConfig();
      nuevo.empresaId = empresaId;
      nuevo.url = dto.url;
      guardado = await this.plcConfigRepository.create(nuevo);
    }

    const requierePlc =
      await this.plcConfigRepository.existsSensorDigitalOAnalogico(empresaId);

    return PlcConfigMapper.toResponseDto(guardado, requierePlc);
  }

  async testConexion(dto: TestConnectionDto): Promise<TestConnectionResponseDto> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(dto.url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (response.ok) {
        return { ok: true, mensaje: 'Conexión exitosa. El PLC respondió correctamente.' };
      }

      return {
        ok: false,
        mensaje: `El PLC respondió con estado ${response.status}.`,
      };
    } catch (err) {
      const esTimeout = (err as Error)?.name === 'AbortError';

      this.logger.warn(
        `Test de conexión falló para "${dto.url}": ${(err as Error)?.message}`,
      );

      return {
        ok: false,
        mensaje: esTimeout
          ? 'El PLC no respondió dentro del tiempo esperado.'
          : 'No se pudo establecer conexión con el PLC.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}