import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
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
import { IngresarLecturaManualDto } from './dto/ingresar-lectura-manual.dto';
import { LecturaMapper } from './mappers/lectura.mapper';
import { SensorEvento } from './entities/sensor-evento.entity';
import { TipoEvento } from './enums/tipo-evento.enum';
import { OrigenLectura } from './enums/origen-lectura.enum';
import { RANGOS_FISICOS } from '../config-parametro/validators/rangos-fisicos.constant';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { LecturasGateway } from './gateway/lecturas.gateway';
import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';
import { HistorialLecturaFilterQueryDto } from './dto/historial-lectura-filter-query.dto';
import { HistorialLecturaResponseDto } from './dto/historial-lectura-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { Repository } from 'typeorm';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../config-parametro/enums/tipo-materia-prima-enum';
import { EstadoMedicion } from './enums/estado-medicion.enum';
// --- nuevo: HU-21 ---
import { ClasificacionLoteService } from '../lote/clasificacion-lote.service';
import { ROLES } from '../rol/constants/roles.constants';
import { AuditLogService } from '../audit/audit-log.service';

const RANGO_DIAS_SLA = 30;

interface DatosEvento {
  sensorId?: number;
  sensorIdRecibido?: string;
  loteId?: number;
  loteIdRecibido?: string;
  valorRecibido?: number;
}

@Injectable()
export class LecturaSensorService {
  private readonly logger = new Logger(LecturaSensorService.name);

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
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepository: Repository<ConfiguracionParametro>,
    // --- nuevo: HU-21 ---
    private readonly clasificacionLoteService: ClasificacionLoteService,
    private readonly auditLogService: AuditLogService,
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

    // HU-21: dispara la clasificación automática si ya están todos los
    // parámetros obligatorios. Best-effort: no debe romper la ingesta.
    this.clasificacionLoteService
      .evaluarYClasificar(lote.id, empresaId)
      .catch((err) =>
        this.logger.error(`Error al clasificar lote ${lote.id}: ${err}`),
      );

    return responseDto;
  }

  // HU-15: fallback manual mientras el sensor no está ACTIVO (inactivo o en
  // falla). A propósito NO toca sensor.estado ni sensor.ultimaLectura: el
  // ingreso manual resuelve la continuidad del proceso de recepción, no la
  // salud del hardware. El sensor sigue en su estado real hasta que él mismo
  // vuelva a reportar — mezclar ambos conceptos ocultaría un sensor roto.
  async ingresarManual(
    dto: IngresarLecturaManualDto,
    usuarioId: number,
    tenant: TenantContext,
  ) {
    const empresaId = this.resolveEmpresaId(tenant);

    const sensor = await this.sensorRepository.findOne(dto.sensorId, empresaId);
    if (!sensor) {
      throw new NotFoundException(`Sensor ${dto.sensorId} no encontrado.`);
    }

    // Criterio 1: el campo manual solo está habilitado cuando el sensor NO
    // está activo (inactivo o con falla, ver HU-15 test "también pasa si con
    // falla habilita").
    if (sensor.estado === EstadoSensor.ACTIVO) {
      throw new BadRequestException(
        `El sensor "${sensor.nombre}" está activo: no se permite carga manual mientras reporta con normalidad.`,
      );
    }

    const ultimaAsociacion = await this.historialRepository.findUltimoPorSensor(
      sensor.id,
      empresaId,
    );
    if (!ultimaAsociacion?.loteIdNuevo) {
      throw new NotFoundException(
        `El sensor "${sensor.nombre}" no está asociado a ningún lote.`,
      );
    }
    const loteId = ultimaAsociacion.loteIdNuevo;

    // Criterio 3: mismo rango físico que se exige a una lectura real.
    const rango = RANGOS_FISICOS[sensor.parametro];
    if (rango && (dto.valor < rango.min || dto.valor > rango.max)) {
      throw new UnprocessableEntityException(
        `El valor ${dto.valor} está fuera del rango físico posible para ${sensor.parametro} (${rango.min}-${rango.max}).`,
      );
    }

    const timestamp = new Date();
    const lectura = LecturaMapper.toEntity(
      sensor.id,
      loteId,
      dto.valor,
      timestamp,
      empresaId,
      OrigenLectura.MANUAL,
      usuarioId,
    );
    const creada = await this.lecturaRepository.create(lectura);

    const responseDto = LecturaMapper.toResponseDto(creada);
    this.lecturasGateway.emitirLectura(responseDto, empresaId);

    // HU-21: mismo trigger que en ingresar().
    this.clasificacionLoteService
      .evaluarYClasificar(loteId, empresaId)
      .catch((err) =>
        this.logger.error(`Error al clasificar lote ${loteId}: ${err}`),
      );

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

  // HU-19
  async consultarHistorial(
    query: HistorialLecturaFilterQueryDto,
    tenant: TenantContext,
  ): Promise<HistorialLecturaResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const fechaInicio = query.fechaInicio
      ? new Date(query.fechaInicio)
      : undefined;
    const fechaFin = this.normalizarFechaFin(query.fechaFin);

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin no puede ser anterior a la fecha de inicio.',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let loteId: number | undefined;
    if (query.loteCodigo) {
      const lote = await this.loteRepository.findByCodigo(
        query.loteCodigo,
        empresaId,
      );
      if (!lote) {
        return { data: [], total: 0, page, limit, rangoAmplio: false };
      }
      loteId = lote.id;
    }

    const [lecturas, total] = await this.lecturaRepository.findHistorial(
      { loteId, fechaInicio, fechaFin, page, limit },
      empresaId,
    );

    const mapaUmbrales = await this.construirMapaUmbrales(empresaId);
    const data = lecturas.map((lectura) =>
      LecturaMapper.toHistorialItemDto(
        lectura,
        this.calcularEstado(
          lectura.valor,
          lectura.sensor.parametro,
          lectura.lote.materiaPrima,
          mapaUmbrales,
        ),
      ),
    );

    // HU-63: solo lecturas manuales van a traer creadoPor (las automáticas,
    // sin @AuditLog en el endpoint de ingesta, no generan registro).
    if (this.puedeVerAuditoria(tenant)) {
      const trazabilidadMap = await this.auditLogService.getTrazabilidadBatch(
        'SensorLectura',
        lecturas.map((l) => l.id),
        empresaId,
      );
      data.forEach((item) => {
        item.auditoria = trazabilidadMap.get(item.id);
      });
    }

    return {
      data,
      total,
      page,
      limit,
      rangoAmplio: this.esRangoAmplio(fechaInicio, fechaFin),
    };
  }

  private puedeVerAuditoria(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.GERENTE;
  }

  // HU-19: export sin paginar, mismos filtros y misma validación de fechas.
  async exportarHistorial(
    query: HistorialLecturaFilterQueryDto,
    tenant: TenantContext,
  ): Promise<string> {
    const empresaId = this.resolveEmpresaId(tenant);

    const fechaInicio = query.fechaInicio
      ? new Date(query.fechaInicio)
      : undefined;
    const fechaFin = this.normalizarFechaFin(query.fechaFin);
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin no puede ser anterior a la fecha de inicio.',
      );
    }

    let loteId: number | undefined;
    if (query.loteCodigo) {
      const lote = await this.loteRepository.findByCodigo(
        query.loteCodigo,
        empresaId,
      );
      if (!lote) {
        return this.aCsv([]);
      }
      loteId = lote.id;
    }

    const lecturas = await this.lecturaRepository.findHistorialCompleto(
      { loteId, fechaInicio, fechaFin },
      empresaId,
    );

    const mapaUmbrales = await this.construirMapaUmbrales(empresaId);
    const data = lecturas.map((lectura) =>
      LecturaMapper.toHistorialItemDto(
        lectura,
        this.calcularEstado(
          lectura.valor,
          lectura.sensor.parametro,
          lectura.lote.materiaPrima,
          mapaUmbrales,
        ),
      ),
    );

    return this.aCsv(data);
  }

  private normalizarFechaFin(fechaFin?: string): Date | undefined {
    if (!fechaFin) return undefined;
    const fecha = new Date(fechaFin);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      fecha.setUTCHours(23, 59, 59, 999);
    }
    return fecha;
  }

  private esRangoAmplio(fechaInicio?: Date, fechaFin?: Date): boolean {
    if (!fechaInicio || !fechaFin) return false;
    const dias =
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24);
    return dias > RANGO_DIAS_SLA;
  }

  private async construirMapaUmbrales(
    empresaId: number,
  ): Promise<Map<string, { umbralMin: number; umbralMax: number }>> {
    const configs = await this.configParametroRepository.find({
      where: { empresaId },
    });
    const mapa = new Map<string, { umbralMin: number; umbralMax: number }>();
    for (const c of configs) {
      mapa.set(`${c.parametro}|${c.tipoMateriaPrima}`, {
        umbralMin: c.umbralMin,
        umbralMax: c.umbralMax,
      });
    }
    return mapa;
  }

  private calcularEstado(
    valor: number,
    parametro: Parametro,
    materiaPrima: TipoMateriaPrima,
    mapa: Map<string, { umbralMin: number; umbralMax: number }>,
  ): EstadoMedicion {
    const umbral = mapa.get(`${parametro}|${materiaPrima}`);
    if (!umbral) return EstadoMedicion.SIN_UMBRAL_CONFIGURADO;
    if (valor < umbral.umbralMin || valor > umbral.umbralMax) {
      return EstadoMedicion.FUERA_DE_RANGO;
    }
    return EstadoMedicion.NORMAL;
  }

  private aCsv(
    data: {
      id: number;
      valor: number;
      unidad: string;
      sensorNombre: string;
      parametro: string;
      loteCodigo: string;
      timestampLectura: Date;
      estado: string;
    }[],
  ): string {
    const headers = [
      'id',
      'valor',
      'unidad',
      'sensor',
      'parametro',
      'lote',
      'fechaHora',
      'estado',
    ];
    const filas = data.map((d) =>
      [
        d.id,
        d.valor,
        d.unidad,
        d.sensorNombre,
        d.parametro,
        d.loteCodigo,
        d.timestampLectura.toISOString(),
        d.estado,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [headers.join(','), ...filas].join('\n');
  }
}
