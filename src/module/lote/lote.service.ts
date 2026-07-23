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
import { LoteMapper } from './mappers/lote.mapper';
import { EstadoLote } from './enums/estado-lote.enum';
import type { ILoteRepository } from './repository/lote-repository.interface';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';
import { SensorService } from '../sensor/sensor.service';
import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';
import { SensorResponseDto } from '../sensor/dto/sensor-response.dto';

@Injectable()
export class LoteService {
  constructor(
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepository: Repository<ConfiguracionParametro>,
    @Inject(forwardRef(() => SensorService))
    private readonly sensorService: SensorService,
  ) {}

  async create(
    dto: CreateLoteDto,
    tenant: TenantContext,
  ): Promise<LoteCreateResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    // Criterio 3: proveedor debe existir y pertenecer a la empresa.
    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedorId, empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException(
        `El proveedor ${dto.proveedorId} no existe o no pertenece a la empresa`,
      );
    }

    // Criterio: parámetros de calidad dentro de los rangos permitidos.
    await this.validarParametros(dto, empresaId);

    // Criterio 1: identificador único.
    const codigo = dto.codigo ?? (await this.generarCodigo(empresaId));
    const existente = await this.loteRepository.findByCodigo(
      codigo,
      empresaId,
    );
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
      clasificacion: dto.clasificacion ?? null,
      destinoInicial: dto.destinoInicial ?? null,
      ubicacionInicial: dto.ubicacionInicial ?? null,
      estado: EstadoLote.REGISTRADO,
      parametros,
    });

    const saved = await this.loteRepository.save(lote);

    // Trae los sensores activos de la ubicación inicial del lote,
    // para que el frontend pueda ofrecerlos como candidatos a asociar.
    let sensoresDisponibles: SensorResponseDto[] = [];
    if (saved.ubicacionInicial) {
      sensoresDisponibles = await this.sensorService.findAll(
        { ubicacion: saved.ubicacionInicial, estado: EstadoSensor.ACTIVO },
        tenant,
      );
    }

    return {
      lote: LoteMapper.toResponseDto(saved),
      sensoresDisponibles,
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
  ): Promise<void> {
    for (const p of dto.parametros) {
      const config = await this.configParametroRepository.findOne({
        where: {
          empresaId,
          parametro: p.parametro,
          tipoMateriaPrima: dto.materiaPrima,
        },
      });
      if (!config) {
        throw new BadRequestException(
          `No existe configuración de rango para el parámetro '${p.parametro}' ` +
            `con materia prima '${dto.materiaPrima}'`,
        );
      }
      if (p.valor < config.umbralMin || p.valor > config.umbralMax) {
        throw new BadRequestException(
          `El valor de '${p.parametro}' (${p.valor}) está fuera del rango permitido ` +
            `[${config.umbralMin} - ${config.umbralMax}]`,
        );
      }
    }
  }

  private async generarCodigo(empresaId: number): Promise<string> {
    const total = await this.loteRepository.countByEmpresa(empresaId);
    const secuencia = (total + 1).toString().padStart(5, '0');
    return `LOTE-${empresaId}-${secuencia}`;
  }
}