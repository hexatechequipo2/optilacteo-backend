import {
  Inject, Injectable, ForbiddenException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { CONFIG_PARAMETRO_REPOSITORY } from './repository/config-parametro.repository.interface';
import type { IConfigParametroRepository } from './repository/config-parametro.repository.interface';
import { CreateConfigParametroDto } from './dto/create-config-parametro.dto';
import { UpdateConfigParametroDto } from './dto/update-config-parametro.dto';
import { ConfigParametroMapper } from './mappers/config-parametro.mapper';
import { ConfigParametroResponseDto } from './dto/config-parametro-response.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { TenantContext } from '../../common/types/tenant-context.type';
import { ROLES } from '../rol/constants/roles.constants';

@Injectable()
export class ConfigParametroService {
  constructor(
    @Inject(CONFIG_PARAMETRO_REPOSITORY)
    private readonly repository: IConfigParametroRepository,
    private readonly auditLogService: AuditLogService,
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
    tenant: TenantContext,
  ): Promise<ConfigParametroResponseDto[]> {
    const configs = await this.repository.findByEmpresa(empresaId);
    const dtos = configs.map(ConfigParametroMapper.toResponse);

    if (this.puedeVerAuditoria(tenant)) {
      const trazabilidadMap = await this.auditLogService.getTrazabilidadBatch(
        'ConfiguracionParametro',
        configs.map((c) => c.id),
        empresaId,
      );
      return dtos.map((dto) => ({ ...dto, auditoria: trazabilidadMap.get(dto.id) }));
    }

    return dtos;
  }

  private puedeVerAuditoria(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.GERENTE;
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