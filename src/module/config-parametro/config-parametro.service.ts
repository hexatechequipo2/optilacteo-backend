import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
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
import { ConfiguracionParametro } from './entities/config-parametro.entity';
import { Parametro } from './enums/parametro.enum';
import { RANGOS_FISICOS } from './validators/rangos-fisicos.constant';

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
    const existente = await this.repository.findByParametroAndTipoMateriaPrima(
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
      throw new NotFoundException('Configuración no encontrada');
    }

    if (config.empresaId !== empresaId) {
      throw new ForbiddenException(
        'No puede modificar configuraciones de otra empresa',
      );
    }

    // HU-40: el PUT es parcial, así que la cadena completa se valida sobre
    // lo que llega mezclado con lo guardado. Los validadores del DTO no
    // alcanzan acá: RangoFisicoValidator necesita `parametro` (omitido en el
    // Update DTO) y UmbralAlertaCoherenteValidator solo corre con los 4 valores.
    const umbrales = {
      umbralAlertaMin: dto.umbralAlertaMin ?? Number(config.umbralAlertaMin),
      umbralMin: dto.umbralMin ?? Number(config.umbralMin),
      umbralMax: dto.umbralMax ?? Number(config.umbralMax),
      umbralAlertaMax: dto.umbralAlertaMax ?? Number(config.umbralAlertaMax),
    };

    const errores = this.validarUmbrales(config.parametro, umbrales);
    if (errores.length > 0) {
      throw new BadRequestException(errores);
    }

    config.umbralAlertaMin = umbrales.umbralAlertaMin;
    config.umbralMin = umbrales.umbralMin;
    config.umbralMax = umbrales.umbralMax;
    config.umbralAlertaMax = umbrales.umbralAlertaMax;

    const updated = await this.repository.save(config);

    return ConfigParametroMapper.toResponse(updated);
  }

  async listarPorEmpresa(
    empresaId: number,
    tenant: TenantContext,
  ): Promise<ConfigParametroResponseDto[]> {
    const configs = await this.repository.findByEmpresa(empresaId);
    const dtos = configs.map((c) => ConfigParametroMapper.toResponse(c));

    if (this.puedeVerAuditoria(tenant)) {
      const trazabilidadMap = await this.auditLogService.getTrazabilidadBatch(
        'ConfiguracionParametro',
        configs.map((c) => c.id),
        empresaId,
      );
      return dtos.map((dto) => ({
        ...dto,
        auditoria: trazabilidadMap.get(dto.id),
      }));
    }

    return dtos;
  }

  // Mismos mensajes que RangoFisicoValidator, UmbralCoherenteValidator y
  // UmbralAlertaCoherenteValidator, para que POST y PUT respondan igual.
  private validarUmbrales(
    parametro: Parametro,
    umbrales: Pick<
      ConfiguracionParametro,
      'umbralAlertaMin' | 'umbralMin' | 'umbralMax' | 'umbralAlertaMax'
    >,
  ): string[] {
    const errores: string[] = [];
    const rango = RANGOS_FISICOS[parametro];

    if (Object.values(umbrales).some((v) => v < rango.min || v > rango.max)) {
      errores.push(
        `El valor para ${parametro} debe estar entre ${rango.min} y ${rango.max}`,
      );
    }

    if (umbrales.umbralMax <= umbrales.umbralMin) {
      errores.push('umbralMax debe ser mayor a umbralMin');
    }

    if (
      umbrales.umbralAlertaMin > umbrales.umbralMin ||
      umbrales.umbralMax > umbrales.umbralAlertaMax
    ) {
      errores.push(
        'umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax',
      );
    }

    return errores;
  }

  private puedeVerAuditoria(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.GERENTE;
  }

  async eliminar(empresaId: number, id: number): Promise<{ message: string }> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundException('Configuración no encontrada');
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
