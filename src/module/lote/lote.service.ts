import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { LoteParametro } from './entities/lote-parametro.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { LoteFilterQueryDto } from './dto/lote-filter-query.dto';
import { FinalizarLoteDto } from './dto/finalizar-lote.dto';
import { LoteResponseDto } from './dto/lote-response.dto';
import { LoteCreateResponseDto } from './dto/lote-create-response.dto';
import { MetricasCalidadResponseDto } from './dto/metricas-calidad-response.dto';
import { LoteMapper } from './mappers/lote.mapper';
import { EstadoLote } from './enums/estado-lote.enum';
import type { ILoteRepository } from './repository/lote-repository.interface';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';
import { SensorService } from '../sensor/sensor.service';
import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';
import { SensorResponseDto } from '../sensor/dto/sensor-response.dto';
import { EstadoProveedor } from '../proveedores/enums/estado-proveedor.enum';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { UNIDAD_POR_PARAMETRO } from '../config-parametro/validators/unidades-parametro.constant';
import { ClasificacionLote } from './enums/clasificacion-lote.enum';
import { ClasificacionLoteService } from './clasificacion-lote.service';
import { LoteRevisionCalidad } from './entities/lote-revision-calidad.entity';
import { RevisarLoteDto } from './dto/revisar-lote.dto';
import { DecisionRevision } from './enums/decision-revision.enum';
import { ConfiguracionComparacionHistoricaService } from '../config-parametro/configuracion-comparacion-historica.service';
import { ComparacionHistoricaResponseDto } from './dto/comparacion-historica-response.dto';
import { ComparacionHistoricaMapper } from './mappers/comparacion-historica.mapper';
import { AuditLogService } from '../audit/audit-log.service';
import { ROLES } from '../rol/constants/roles.constants';

@Injectable()
export class LoteService {
  constructor(
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepository: Repository<ConfiguracionParametro>,
    @InjectRepository(SensorLectura)
    private readonly sensorLecturaRepository: Repository<SensorLectura>,
    @Inject(forwardRef(() => SensorService))
    private readonly sensorService: SensorService,
    private readonly clasificacionLoteService: ClasificacionLoteService,
    @InjectRepository(LoteRevisionCalidad)
    private readonly loteRevisionRepository: Repository<LoteRevisionCalidad>,
    private readonly configuracionComparacionHistoricaService: ConfiguracionComparacionHistoricaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // HU-63
  private puedeVerAuditoria(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.GERENTE;
  }

  async create(
    dto: CreateLoteDto,
    tenant: TenantContext,
  ): Promise<LoteCreateResponseDto & { warnings?: string[] }> {
    const empresaId = this.resolveEmpresaId(tenant);

    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedorId, empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException(
        `El proveedor ${dto.proveedorId} no existe o no pertenece a la empresa`,
      );
    }
    if (proveedor.estado !== EstadoProveedor.ACTIVA) {
      throw new BadRequestException(
        `El proveedor "${proveedor.razonSocial}" no está activo (estado: ${proveedor.estado}) y no puede asociarse a un lote nuevo.`,
      );
    }

    const { warnings } = await this.validarParametros(dto, empresaId);

    const codigo = dto.codigo ?? (await this.generarCodigo(empresaId));
    const existente = await this.loteRepository.findByCodigo(codigo, empresaId);
    if (existente) {
      throw new ConflictException(
        `Ya existe un lote con el identificador '${codigo}' para esta empresa`,
      );
    }

    const parametros = dto.parametros.map((p) => {
      const parametro = new LoteParametro();
      parametro.parametro = p.parametro;
      parametro.valor = p.valor;
      return parametro;
    });

    const lote = this.loteRepository.create({
      codigo,
      empresaId,
      proveedorId: dto.proveedorId,
      materiaPrima: dto.materiaPrima,
      fechaIngreso: new Date(dto.fechaIngreso),
      clasificacion: null,
      destinoInicial: dto.destinoInicial ?? null,
      ubicacionInicial: dto.ubicacionInicial ?? null,
      estado: EstadoLote.REGISTRADO,
      parametros,
      cantidad: dto.cantidad,
      cantidadDisponible: dto.cantidad,
    });

    const saved = await this.loteRepository.save(lote);

    await this.clasificacionLoteService.evaluarYClasificar(saved.id, empresaId);

    const actualizado = await this.loteRepository.findById(saved.id, empresaId);

    let sensoresDisponibles: SensorResponseDto[] = [];
    if (actualizado!.ubicacionInicial) {
      sensoresDisponibles = await this.sensorService.findAll(
        {
          ubicacion: actualizado!.ubicacionInicial,
          estado: EstadoSensor.ACTIVO,
        },
        tenant,
      );
    }

    return {
      lote: LoteMapper.toResponseDto(actualizado!),
      sensoresDisponibles,
      warnings,
    };
  }

  async findAll(query: LoteFilterQueryDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const [lotes, total] = await this.loteRepository.findAll(query, empresaId);

    let data = LoteMapper.toResponseDtoList(lotes);

    if (this.puedeVerAuditoria(tenant)) {
      const trazabilidadMap = await this.auditLogService.getTrazabilidadBatch(
        'Lote',
        lotes.map((l) => l.id),
        empresaId,
      );
      data = data.map((dto) => ({
        ...dto,
        auditoria: trazabilidadMap.get(dto.id),
      }));
    }

    return {
      data,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  async findOne(id: number, tenant: TenantContext): Promise<LoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    const dto = LoteMapper.toResponseDto(lote);

    if (this.puedeVerAuditoria(tenant)) {
      dto.auditoria = await this.auditLogService.getTrazabilidad(
        'Lote',
        id,
        empresaId,
      );
    }

    return dto;
  }

  async update(
    id: number,
    dto: UpdateLoteDto,
    tenant: TenantContext,
  ): Promise<LoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    if (dto.materiaPrima) lote.materiaPrima = dto.materiaPrima;
    if (dto.fechaIngreso) lote.fechaIngreso = new Date(dto.fechaIngreso);
    if (dto.clasificacion !== undefined) lote.clasificacion = dto.clasificacion;
    if (dto.destinoInicial !== undefined)
      lote.destinoInicial = dto.destinoInicial;

    const saved = await this.loteRepository.save(lote);
    return LoteMapper.toResponseDto(saved);
  }

  // HU-62
  async finalizar(
    id: number,
    dto: FinalizarLoteDto,
    tenant: TenantContext,
  ): Promise<LoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    if (lote.estado === EstadoLote.FINALIZADO) {
      throw new BadRequestException(
        `El lote ${id} ya está finalizado y no puede modificarse`,
      );
    }

    lote.estado = EstadoLote.FINALIZADO;
    if (dto.rendimiento !== undefined) {
      lote.rendimiento = dto.rendimiento;
      lote.unidadRendimiento = dto.unidadRendimiento ?? null;
    }

    const saved = await this.loteRepository.save(lote);
    return LoteMapper.toResponseDto(saved);
  }

  async getMetricasCalidad(
    id: number,
    tenant: TenantContext,
  ): Promise<MetricasCalidadResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    if (lote.estado !== EstadoLote.EN_PROCESO) {
      return { enProceso: false };
    }

    const ultimasLecturas = await this.sensorLecturaRepository
      .createQueryBuilder('lectura')
      .innerJoinAndSelect('lectura.sensor', 'sensor')
      .distinctOn(['lectura.sensorId'])
      .where('lectura.loteId = :loteId', { loteId: id })
      .andWhere('lectura.empresaId = :empresaId', { empresaId })
      .orderBy('lectura.sensorId', 'ASC')
      .addOrderBy('lectura.timestampLectura', 'DESC')
      .getMany();

    const parametros = await Promise.all(
      ultimasLecturas.map(async (lectura) => {
        const config = await this.configParametroRepository.findOne({
          where: {
            empresaId,
            parametro: lectura.sensor.parametro,
            tipoMateriaPrima: lote.materiaPrima,
          },
        });

        const umbralMin = config?.umbralMin ?? null;
        const umbralMax = config?.umbralMax ?? null;
        const fueraDeRango =
          umbralMin !== null &&
          umbralMax !== null &&
          (lectura.valor < umbralMin || lectura.valor > umbralMax);

        return {
          parametro: lectura.sensor.parametro,
          valor: lectura.valor,
          unidad: UNIDAD_POR_PARAMETRO[lectura.sensor.parametro],
          umbralMin,
          umbralMax,
          fueraDeRango,
          timestampLectura: lectura.timestampLectura,
        };
      }),
    );

    return { enProceso: true, loteId: id, parametros };
  }

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  private async validarParametros(
    dto: CreateLoteDto,
    empresaId: number,
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];
    for (const p of dto.parametros) {
      const config = await this.configParametroRepository.findOne({
        where: {
          empresaId,
          parametro: p.parametro,
          tipoMateriaPrima: dto.materiaPrima,
        },
      });
      if (!config) {
        warnings.push(
          `No existe configuración de rango para el parámetro '${p.parametro}' con materia prima '${dto.materiaPrima}'`,
        );
        continue;
      }
      if (p.valor < config.umbralMin || p.valor > config.umbralMax) {
        warnings.push(
          `El valor de '${p.parametro}' (${p.valor}) está fuera del rango permitido [${config.umbralMin} - ${config.umbralMax}]`,
        );
      }
    }
    return { warnings };
  }

  private async generarCodigo(empresaId: number): Promise<string> {
    const total = await this.loteRepository.countByEmpresa(empresaId);
    const secuencia = (total + 1).toString().padStart(5, '0');
    return `LOTE-${empresaId}-${secuencia}`;
  }

  async getHistorialClasificaciones(id: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) throw new NotFoundException(`Lote ${id} no encontrado`);
    return this.clasificacionLoteService.historialDeLote(id, empresaId);
  }

  async findNoAptos(tenant: TenantContext): Promise<LoteResponseDto[]> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lotes =
      await this.loteRepository.findNoAptosSinRevisionVigente(empresaId);
    return LoteMapper.toResponseDtoList(lotes);
  }

  async revisarLote(
    id: number,
    dto: RevisarLoteDto,
    tenant: TenantContext,
    usuarioId: number,
  ): Promise<LoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    if (lote.clasificacion !== ClasificacionLote.NO_APTO) {
      throw new BadRequestException(
        `El lote ${id} no está en estado No Apto (clasificación actual: ${lote.clasificacion})`,
      );
    }

    const yaDecidido = await this.tieneRevisionVigente(id, empresaId);
    if (yaDecidido) {
      throw new ConflictException(
        `El lote ${id} ya tiene una revisión de calidad vigente. Se requiere una nueva clasificación para volver a revisarlo.`,
      );
    }

    const revision = this.loteRevisionRepository.create({
      loteId: id,
      decision: dto.decision,
      justificacion: dto.justificacion,
      usuarioId,
      empresaId,
    });
    await this.loteRevisionRepository.save(revision);

    if (dto.decision === DecisionRevision.APROBADO) {
      lote.clasificacion = ClasificacionLote.APTO;
    } else {
      lote.estado = EstadoLote.RECHAZADO;
    }
    const saved = await this.loteRepository.save(lote);

    return LoteMapper.toResponseDto(saved);
  }

  private async tieneRevisionVigente(
    loteId: number,
    empresaId: number,
  ): Promise<boolean> {
    const ultimaClasificacion =
      await this.clasificacionLoteService.historialDeLote(loteId, empresaId);
    const ultimaClasificacionFecha = ultimaClasificacion[0]?.createdAt;

    const ultimaRevision = await this.loteRevisionRepository.findOne({
      where: { loteId, empresaId },
      order: { createdAt: 'DESC' },
    });

    if (!ultimaRevision) return false;
    if (!ultimaClasificacionFecha) return true;

    return ultimaRevision.createdAt > ultimaClasificacionFecha;
  }

  async getHistorialRevisiones(id: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) throw new NotFoundException(`Lote ${id} no encontrado`);
    return this.loteRevisionRepository.find({
      where: { loteId: id, empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async compararConHistorico(
    id: number,
    tenant: TenantContext,
  ): Promise<ComparacionHistoricaResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    const config =
      await this.configuracionComparacionHistoricaService.getConfig(empresaId);

    const historicos = await this.loteRepository.findUltimosAptos(
      empresaId,
      lote.materiaPrima,
      config.cantidadRegistrosHistoricos,
      lote.id,
    );

    return ComparacionHistoricaMapper.build(lote, historicos, config);
  }
}
