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
import { Lote } from './entities/lote.entity';
import { LoteParametro } from './entities/lote-parametro.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { LoteFilterQueryDto } from './dto/lote-filter-query.dto';
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
  ) {}

  async create(
    dto: CreateLoteDto,
    tenant: TenantContext,
  ): Promise<LoteCreateResponseDto & { warnings?: string[] }> {
    const empresaId = this.resolveEmpresaId(tenant);

    // Proveedor debe existir y pertenecer a la empresa
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

    // Validar parámetros pero sin bloquear
    const { warnings } = await this.validarParametros(dto, empresaId);

    // Identificador único
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
    });

    const saved = await this.loteRepository.save(lote);

    // Clasificación automática
    await this.clasificacionLoteService.evaluarYClasificar(saved.id, empresaId);

    // Refrescar el lote ya clasificado
    const actualizado = await this.loteRepository.findById(saved.id, empresaId);

    // Sensores disponibles
    let sensoresDisponibles: SensorResponseDto[] = [];
    if (actualizado!.ubicacionInicial) {
      sensoresDisponibles = await this.sensorService.findAll(
        { ubicacion: actualizado!.ubicacionInicial, estado: EstadoSensor.ACTIVO },
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
    const [lotes, total] = await this.loteRepository.findAll(
      query,
      empresaId,
    );
    return {
      data: LoteMapper.toResponseDtoList(lotes),
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
    return LoteMapper.toResponseDto(lote);
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

  async finalizar(
    id: number,
    tenant: TenantContext,
  ): Promise<LoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }
    lote.estado = EstadoLote.FINALIZADO;
    const saved = await this.loteRepository.save(lote);
    return LoteMapper.toResponseDto(saved);
  }

  // HU-18: snapshot de métricas de calidad para la pantalla de monitoreo.
  // El aislamiento multi-tenant (AC8) sale gratis de reusar el mismo
  // findById(id, empresaId) que usa findOne(): si el lote es de otra
  // empresa, findById devuelve null igual que si no existiera.
  async getMetricasCalidad(
    id: number,
    tenant: TenantContext,
  ): Promise<MetricasCalidadResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const lote = await this.loteRepository.findById(id, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    // AC6: señal explícita, no data vacía ambigua.
    if (lote.estado !== EstadoLote.EN_PROCESO) {
      return { enProceso: false };
    }

    // Última lectura por sensor para este lote (Postgres DISTINCT ON).
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
        // Sin configuración de umbral para este parámetro/materia prima no
        // se puede afirmar que está fuera de rango: se informa como "sin
        // umbral configurado" en vez de asumir que está OK o mal.
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
        where: { empresaId, parametro: p.parametro, tipoMateriaPrima: dto.materiaPrima },
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
    const lotes = await this.loteRepository.findNoAptosSinRevisionVigente(empresaId);
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

    // Bloquea re-decidir sin que medie una nueva clasificación: si ya hay
    // una revisión posterior a la última clasificación NO_APTO, está resuelto.
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

  private async tieneRevisionVigente(loteId: number, empresaId: number): Promise<boolean> {
    const ultimaClasificacion = await this.clasificacionLoteService.historialDeLote(loteId, empresaId);
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
}