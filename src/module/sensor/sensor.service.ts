import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorFilterQueryDto } from './dto/sensor-filter-query.dto';
import { SensorMapper } from './mappers/sensor.mapper';
import type { ISensorRepository } from './repository/sensor.repository.interface';
import { SENSOR_REPOSITORY } from './repository/sensor.repository.interface';
import type { ISensorLoteHistorialRepository } from './repository/sensor-lote-historial.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from './repository/sensor-lote-historial.repository.interface';
import type { ILoteRepository } from '../lote/repository/lote-repository.interface';
import { LOTE_REPOSITORY } from '../lote/repository/lote-repository.interface';
import type { ILoteUbicacionHistorialRepository } from '../lote/repository/lote-ubicacion-historial.repository.interface';
import { LOTE_UBICACION_HISTORIAL_REPOSITORY } from '../lote/repository/lote-ubicacion-historial.repository.interface';
import { EstadoSensor } from './enums/estado-sensor.enum';
import { SensorLoteHistorial } from './entities/sensor-lote-historial.entity';
import { LoteUbicacionHistorial } from '../lote/entities/lote-ubicacion-historial.entity';
import { SensorResponseDto } from './dto/sensor-response.dto';
import type { TenantContext } from '../../common/types/tenant-context.type';
import type { Sensor } from './entities/sensor.entity';
import type { Lote } from '../lote/entities/lote.entity';

@Injectable()
export class SensorService {
  constructor(
    @Inject(SENSOR_REPOSITORY)
    private readonly sensorRepository: ISensorRepository,
    @Inject(SENSOR_LOTE_HISTORIAL_REPOSITORY)
    private readonly historialRepository: ISensorLoteHistorialRepository,
    @Inject(LOTE_UBICACION_HISTORIAL_REPOSITORY)
    private readonly loteUbicacionRepository: ILoteUbicacionHistorialRepository,
    @Inject(forwardRef(() => LOTE_REPOSITORY))
    private readonly loteRepository: ILoteRepository,
  ) {}

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  private validarRango(min: number, max: number) {
    if (min >= max) {
      throw new BadRequestException('El rango mínimo debe ser menor al rango máximo.');
    }
  }

  async create(dto: CreateSensorDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    this.validarRango(dto.rangoMinFavor, dto.rangoMaxFavor);

    const existente = await this.sensorRepository.findByNombre(dto.nombre, empresaId);
    if (existente) {
      throw new ConflictException(
        `Ya existe un sensor con el nombre "${dto.nombre}" en esta empresa.`,
      );
    }

    const sensor = SensorMapper.toEntity(dto, empresaId);
    const creado = await this.sensorRepository.create(sensor);
    return SensorMapper.toResponseDto(creado, null);
  }

  async findAll(filter: SensorFilterQueryDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const sensores = await this.sensorRepository.findAll(filter, empresaId);
    const ids = sensores.map((s) => s.id);
    const ultimos = await this.historialRepository.findUltimosPorSensores(ids, empresaId);
    const loteActualPorSensor = new Map(ultimos.map((h) => [h.sensorId, h.loteIdNuevo]));

    return sensores.map((s) =>
      SensorMapper.toResponseDto(s, loteActualPorSensor.get(s.id) ?? null),
    );
  }

  async findOne(id: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const sensor = await this.sensorRepository.findOne(id, empresaId);
    if (!sensor) {
      throw new NotFoundException('Sensor no encontrado.');
    }
    const ultimo = await this.historialRepository.findUltimoPorSensor(id, empresaId);
    return SensorMapper.toResponseDto(sensor, ultimo?.loteIdNuevo ?? null);
  }

  async update(id: number, dto: UpdateSensorDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const sensor = await this.sensorRepository.findOne(id, empresaId);
    if (!sensor) {
      throw new NotFoundException('Sensor no encontrado.');
    }

    if (dto.nombre && dto.nombre !== sensor.nombre) {
      const existente = await this.sensorRepository.findByNombre(dto.nombre, empresaId);
      if (existente && existente.id !== id) {
        throw new ConflictException(
          `Ya existe un sensor con el nombre "${dto.nombre}" en esta empresa.`,
        );
      }
    }

    const min = dto.rangoMinFavor ?? sensor.rangoMinFavor;
    const max = dto.rangoMaxFavor ?? sensor.rangoMaxFavor;
    this.validarRango(min, max);

    Object.assign(sensor, dto);
    const actualizado = await this.sensorRepository.save(sensor);
    const ultimo = await this.historialRepository.findUltimoPorSensor(id, empresaId);
    return SensorMapper.toResponseDto(actualizado, ultimo?.loteIdNuevo ?? null);
  }

  async remove(id: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const sensor = await this.sensorRepository.findOne(id, empresaId);
    if (!sensor) {
      throw new NotFoundException('Sensor no encontrado.');
    }

    const ultimo = await this.historialRepository.findUltimoPorSensor(id, empresaId);
    if (ultimo && ultimo.loteIdNuevo) {
      throw new ConflictException(
        'No se puede eliminar el sensor: está asociado a un lote.',
      );
    }

    await this.sensorRepository.remove(sensor);
  }

// HU-33
  async asociarALote(loteId: number, sensorIds: number[], usuarioId: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const lote = await this.loteRepository.findById(loteId, empresaId);
    if (!lote) {
      throw new NotFoundException('Lote no encontrado.');
    }

    const resultados: SensorResponseDto[] = [];

    for (const sensorId of sensorIds) {
      const sensor = await this.sensorRepository.findOne(sensorId, empresaId);
      if (!sensor) {
        throw new NotFoundException(`Sensor ${sensorId} no encontrado.`);
      }

      if (sensor.estado !== EstadoSensor.ACTIVO) {
        throw new BadRequestException(
          `El sensor "${sensor.nombre}" no está activo y no puede asociarse a un lote.`,
        );
      }

      const ultimo = await this.historialRepository.findUltimoPorSensor(sensorId, empresaId);
      const loteActualId = ultimo?.loteIdNuevo ?? null;

      if (loteActualId === loteId) {
        resultados.push(SensorMapper.toResponseDto(sensor, loteActualId));
        continue;
      }

      // TODO: validar reasociación cuando el lote anterior tenga mediciones registradas.
      // Se implementará junto con la HU de mediciones.

      const registro = new SensorLoteHistorial();
      registro.sensorId = sensorId;
      registro.loteIdAnterior = loteActualId;
      registro.loteIdNuevo = loteId;
      registro.userId = usuarioId;
      registro.empresaId = empresaId;
      await this.historialRepository.create(registro);

      await this.actualizarUbicacionLoteSiCorresponde(lote, sensor, usuarioId, empresaId);

      resultados.push(SensorMapper.toResponseDto(sensor, loteId));
    }

    return resultados;
  }

  private async actualizarUbicacionLoteSiCorresponde(
    lote: Lote,
    sensor: Sensor,
    usuarioId: number,
    empresaId: number,
  ): Promise<void> {
    const ultimaUbicacion = await this.loteUbicacionRepository.findUltimoPorLote(lote.id, empresaId);
    const ubicacionActual = ultimaUbicacion?.ubicacionNueva ?? lote.ubicacionInicial ?? null;

    if (ubicacionActual === sensor.ubicacion) {
      return;
    }

    const registro = new LoteUbicacionHistorial();
    registro.loteId = lote.id;
    registro.sensorId = sensor.id;
    registro.ubicacionAnterior = ubicacionActual;
    registro.ubicacionNueva = sensor.ubicacion;
    registro.userId = usuarioId;
    registro.empresaId = empresaId;
    await this.loteUbicacionRepository.create(registro);
  }

  async historialPorSensor(sensorId: number, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const historial = await this.historialRepository.findBySensor(sensorId, empresaId);
    return historial.map(SensorMapper.historialToResponseDto);
  }
}