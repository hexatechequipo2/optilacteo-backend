import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ISensorRepository } from '../sensor/repository/sensor.repository.interface';
import { SENSOR_REPOSITORY } from '../sensor/repository/sensor.repository.interface';
import type { ISensorLoteHistorialRepository } from '../sensor/repository/sensor-lote-historial.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../sensor/repository/sensor-lote-historial.repository.interface';
import type { ILoteRepository } from '../lote/repository/lote-repository.interface';
import { LOTE_REPOSITORY } from '../lote/repository/lote-repository.interface';
import type { ISensorLecturaRepository } from './repository/sensor-lectura.repository.interface';
import { SENSOR_LECTURA_REPOSITORY } from './repository/sensor-lectura.repository.interface';
import type { ISensorEventoRepository } from './repository/sensor-evento.repository.interface';
import { SENSOR_EVENTO_REPOSITORY } from './repository/sensor-evento.repository.interface';
import { IngresarLecturaDto } from './dto/ingresar-lectura.dto';
import { LecturaMapper } from './mappers/lectura.mapper';
import { SensorEvento } from './entities/sensor-evento.entity';
import { TipoEvento } from './enums/tipo-evento.enum';
import { RANGOS_FISICOS } from '../config-parametro/validators/rangos-fisicos.constant';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { LecturasGateway } from './gateway/lecturas.gateway';
import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';

interface DatosEvento {
  sensorId?: number;
  sensorIdRecibido?: string;
  loteId?: number;
  loteIdRecibido?: string;
  valorRecibido?: number;
}

@Injectable()
export class LecturaSensorService {
  constructor(
    @Inject(SENSOR_REPOSITORY)
    private readonly sensorRepository: ISensorRepository,
    @Inject(SENSOR_LOTE_HISTORIAL_REPOSITORY)
    private readonly historialRepository: ISensorLoteHistorialRepository,
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @Inject(SENSOR_LECTURA_REPOSITORY)
    private readonly lecturaRepository: ISensorLecturaRepository,
    @Inject(SENSOR_EVENTO_REPOSITORY)
    private readonly eventoRepository: ISensorEventoRepository,
    private readonly lecturasGateway: LecturasGateway,
  ) {}

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  async ingresar(dto: IngresarLecturaDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);

    // Paso 3 de la cascada: existencia de sensor_id y lote_id.
    const sensor = await this.sensorRepository.findByNombre(
      dto.sensor_id,
      empresaId,
    );
    if (!sensor) {
      await this.registrarEvento(TipoEvento.SENSOR_NO_ENCONTRADO, empresaId, {
        sensorIdRecibido: dto.sensor_id,
        loteIdRecibido: dto.lote_id,
      });
      throw new NotFoundException(`Sensor "${dto.sensor_id}" no encontrado.`);
    }

    const lote = await this.loteRepository.findByCodigo(dto.lote_id, empresaId);
    if (!lote) {
      await this.registrarEvento(TipoEvento.LOTE_NO_ENCONTRADO, empresaId, {
        sensorId: sensor.id,
        sensorIdRecibido: dto.sensor_id,
        loteIdRecibido: dto.lote_id,
      });
      throw new NotFoundException(`Lote "${dto.lote_id}" no encontrado.`);
    }

    // Evita lecturas huérfanas/mal enrutadas: el sensor tiene que estar
    // asociado HOY a este lote (última fila de sensor_lote_historial).
    const ultimaAsociacion = await this.historialRepository.findUltimoPorSensor(
      sensor.id,
      empresaId,
    );
    if (ultimaAsociacion?.loteIdNuevo !== lote.id) {
      await this.registrarEvento(
        TipoEvento.SENSOR_NO_ASOCIADO_A_LOTE,
        empresaId,
        {
          sensorId: sensor.id,
          sensorIdRecibido: dto.sensor_id,
          loteId: lote.id,
          loteIdRecibido: dto.lote_id,
        },
      );
      throw new NotFoundException(
        `El sensor "${dto.sensor_id}" no está asociado al lote "${dto.lote_id}".`,
      );
    }

    // Paso 4 de la cascada: rango físico posible (no el rango de aceptación
    // del sensor, que es otro concepto de negocio distinto).
    const rango = RANGOS_FISICOS[sensor.parametro];
    if (rango && (dto.valor < rango.min || dto.valor > rango.max)) {
      await this.registrarEvento(TipoEvento.VALOR_FUERA_DE_RANGO, empresaId, {
        sensorId: sensor.id,
        sensorIdRecibido: dto.sensor_id,
        loteId: lote.id,
        loteIdRecibido: dto.lote_id,
        valorRecibido: dto.valor,
      });

      // HU-14: una lectura fuera del rango físico posible es evidencia de
      // dato erróneo (sensor descalibrado, ruido eléctrico, etc.), así que
      // el sensor pasa a FALLA. Distinto de INACTIVO (que setea el cron
      // cuando el sensor deja de reportar del todo): acá el sensor sigue
      // "hablando", solo que con datos inválidos. No tocamos ultimaLectura
      // porque el valor fue rechazado, no persistido.
      sensor.estado = EstadoSensor.FALLA;
      await this.sensorRepository.save(sensor);
      this.lecturasGateway.emitirSensorFalla(
        { sensorId: sensor.id, nombre: sensor.nombre },
        empresaId,
      );

      throw new UnprocessableEntityException(
        `El valor ${dto.valor} está fuera del rango físico posible para ${sensor.parametro} (${rango.min}-${rango.max}).`,
      );
    }

    // Paso 5: persistencia.
    const timestampLectura = new Date(dto.timestamp);
    const lectura = LecturaMapper.toEntity(
      sensor.id,
      lote.id,
      dto.valor,
      timestampLectura,
      empresaId,
    );
    const creada = await this.lecturaRepository.create(lectura);

    // Recibir una lectura válida es la señal de recuperación automática:
    // saca al sensor de cualquier estado no-ACTIVO, sea INACTIVO (dejó de
    // reportar y volvió) o FALLA (mandó un valor fuera de rango y el
    // siguiente vino bien). Ver HU-14, criterio 6.
    const noEstabaActivo = sensor.estado !== EstadoSensor.ACTIVO;

    sensor.ultimaLectura = timestampLectura;
    if (noEstabaActivo) {
      sensor.estado = EstadoSensor.ACTIVO;
    }
    await this.sensorRepository.save(sensor);

    if (noEstabaActivo) {
      await this.registrarEvento(TipoEvento.SENSOR_RECUPERADO, empresaId, {
        sensorId: sensor.id,
        sensorIdRecibido: dto.sensor_id,
        loteId: lote.id,
        loteIdRecibido: dto.lote_id,
      });
      this.lecturasGateway.emitirSensorRecuperado(
        { sensorId: sensor.id, nombre: sensor.nombre },
        empresaId,
      );
    }

    const responseDto = LecturaMapper.toResponseDto(creada);
    this.lecturasGateway.emitirLectura(responseDto, empresaId);

    return responseDto;
  }

  private async registrarEvento(
    tipoEvento: TipoEvento,
    empresaId: number,
    datos: DatosEvento,
  ): Promise<void> {
    const evento = new SensorEvento();
    evento.tipoEvento = tipoEvento;
    evento.empresaId = empresaId;
    evento.sensorId = datos.sensorId ?? null;
    evento.sensorIdRecibido = datos.sensorIdRecibido ?? null;
    evento.loteId = datos.loteId ?? null;
    evento.loteIdRecibido = datos.loteIdRecibido ?? null;
    evento.valorRecibido = datos.valorRecibido ?? null;
    await this.eventoRepository.create(evento);
  }
}