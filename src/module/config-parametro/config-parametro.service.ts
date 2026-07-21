import {
  Inject, Injectable, ForbiddenException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { CONFIG_PARAMETRO_REPOSITORY } from './repository/config-parametro.repository.interface';
import type { IConfigParametroRepository } from './repository/config-parametro.repository.interface';
import { CreateConfigParametroDto } from './dto/create-config-parametro.dto';
import { UpdateConfigParametroDto } from './dto/update-config-parametro.dto';
import { ConfigParametroMapper } from './mappers/config-parametro.mapper';
import { ConfigParametroResponseDto } from './dto/config-parametro-response.dto';

@Injectable()
export class ConfigParametroService {
  constructor(
    @Inject(CONFIG_PARAMETRO_REPOSITORY)
    private readonly repository: IConfigParametroRepository,
  ) {}

  async crear(
    empresaId: number,
    dto: CreateConfigParametroDto,
  ): Promise<ConfigParametroResponseDto> {
    const existente =
      await this.repository.findByParametroAndTipoMateriaPrima(
        empresaId,
        dto.parametro,
        dto.tipoMateriaPrima,
      );

    if (existente) {
      throw new ConflictException(
        'Ya existe una configuración para este parámetro y tipo de materia prima',
      );
    }

    const entity = ConfigParametroMapper.toEntity(dto, empresaId);

    const saved = await this.repository.save(entity);

    return ConfigParametroMapper.toResponse(saved);
  }

  async editar(
    empresaId: number,
    id: number,
    dto: UpdateConfigParametroDto,
  ): Promise<ConfigParametroResponseDto> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundException(
        'Configuración no encontrada',
      );
    }

    if (config.empresaId !== empresaId) {
      throw new ForbiddenException(
        'No puede modificar configuraciones de otra empresa',
      );
    }

    const umbralMin =
      dto.umbralMin ?? Number(config.umbralMin);

    const umbralMax =
      dto.umbralMax ?? Number(config.umbralMax);

    if (umbralMin >= umbralMax) {
      throw new ConflictException(
        'umbralMin debe ser menor a umbralMax',
      );
    }

    config.umbralMin = umbralMin;
    config.umbralMax = umbralMax;

    const updated = await this.repository.save(config);

    return ConfigParametroMapper.toResponse(updated);
  }

  async listarPorEmpresa(
    empresaId: number,
  ): Promise<ConfigParametroResponseDto[]> {
    const configs =
      await this.repository.findByEmpresa(empresaId);

    return configs.map(ConfigParametroMapper.toResponse);
  }

  async eliminar(
    empresaId: number,
    id: number,
  ): Promise<{ message: string }> {
    const config =
      await this.repository.findById(id);

    if (!config) {
      throw new NotFoundException(
        'Configuración no encontrada',
      );
    }

    if (config.empresaId !== empresaId) {
      throw new ForbiddenException(
        'No puede eliminar configuraciones de otra empresa',
      );
    }

    await this.repository.delete(id);
    return { message: 'Configuración eliminada exitosamente' };
  }
}