import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
import { HistorialLecturaFilterQueryDto } from './dto/historial-lectura-filter-query.dto';
import { HistorialLecturaResponseDto } from './dto/historial-lectura-response.dto';

import { LecturaMapper } from './mappers/lectura.mapper';

import { SensorEvento } from './entities/sensor-evento.entity';

import { TipoEvento } from './enums/tipo-evento.enum';
import { OrigenLectura } from './enums/origen-lectura.enum';
import { EstadoMedicion } from './enums/estado-medicion.enum';

import { RANGOS_FISICOS } from '../config-parametro/validators/rangos-fisicos.constant';

import type { TenantContext } from '../../common/types/tenant-context.type';

import { LecturasGateway } from './gateway/lecturas.gateway';

import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';

import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { Parametro } from '../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../config-parametro/enums/tipo-materia-prima-enum';

import { ClasificacionLoteService } from '../lote/clasificacion-lote.service';

import { ROLES } from '../rol/constants/roles.constants';

import { AuditLogService } from '../audit/audit-log.service';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

// --- nuevo: HU-50 ---
import { AnomaliaService } from '../anomalia/anomalia.service';

const RANGO_DIAS_SLA = 30;
const VENTANA_HISTORICO_ANOMALIA = 10;

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

    private readonly clasificacionLoteService: ClasificacionLoteService,

    private readonly auditLogService: AuditLogService,

    private readonly notificacionesService: NotificacionesService,

    // --- nuevo: HU-50 ---
    private readonly anomaliaService: AnomaliaService,
  ) {}

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }

    return tenant.empresaId;
  }

  // ============================================================
  // HU-50: helper compartido entre ingresar() e ingresarManual()
  // ============================================================

  private evaluarAnomaliaBestEffort(
    empresaId: number,
    loteId: number,
    loteCodigo: string,
    parametro: Parametro,
    valor: number,
  ): void {
    this.lecturaRepository
      .findUltimosValores(loteId, parametro, empresaId, VENTANA_HISTORICO_ANOMALIA)
      .then((historico) =>
        this.anomaliaService.evaluarAnomalia({
          empresaId,
          loteId,
          loteCodigo,
          parametro,
          valor,
          historicoReciente: historico,
        }),
      )
      .catch((err) =>
        this.logger.error(
          `Error al evaluar anomalía para lote ${loteId}, parámetro ${parametro}: ${err}`,
        ),
      );
  }

  // ============================================================
  // INGRESO DE LECTURA AUTOMÁTICA
  // ============================================================

  async ingresar(dto: IngresarLecturaDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);

    // ------------------------------------------------------------
    // Paso 3: existencia del sensor
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Paso 3: existencia del lote
    // ------------------------------------------------------------

    const lote = await this.loteRepository.findByCodigo(dto.lote_id, empresaId);

    if (!lote) {
      await this.registrarEvento(TipoEvento.LOTE_NO_ENCONTRADO, empresaId, {
        sensorId: sensor.id,
        sensorIdRecibido: dto.sensor_id,
        loteIdRecibido: dto.lote_id,
      });

      throw new NotFoundException(`Lote "${dto.lote_id}" no encontrado.`);
    }

    // ------------------------------------------------------------
    // Verificación de asociación actual sensor -> lote
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Paso 4: rango físico posible
    // ------------------------------------------------------------

    const rango = RANGOS_FISICOS[sensor.parametro];

    if (rango && (dto.valor < rango.min || dto.valor > rango.max)) {
      await this.registrarEvento(TipoEvento.VALOR_FUERA_DE_RANGO, empresaId, {
        sensorId: sensor.id,
        sensorIdRecibido: dto.sensor_id,
        loteId: lote.id,
        loteIdRecibido: dto.lote_id,
        valorRecibido: dto.valor,
      });

      // HU-14:
      // Una lectura fuera del rango físico posible indica una
      // posible falla del sensor.
      sensor.estado = EstadoSensor.FALLA;

      await this.sensorRepository.save(sensor);

      this.lecturasGateway.emitirSensorFalla(
        {
          sensorId: sensor.id,
          nombre: sensor.nombre,
        },
        empresaId,
      );

      throw new UnprocessableEntityException(
        `El valor ${dto.valor} está fuera del rango físico posible para ${sensor.parametro} (${rango.min}-${rango.max}).`,
      );
    }

    // ------------------------------------------------------------
    // Paso 5: persistencia de lectura
    // ------------------------------------------------------------

    const timestampLectura = new Date(dto.timestamp);

    const lectura = LecturaMapper.toEntity(
      sensor.id,
      lote.id,
      dto.valor,
      timestampLectura,
      empresaId,
    );

    const creada = await this.lecturaRepository.create(lectura);

    // ------------------------------------------------------------
    // HU-14:
    // Una lectura válida recupera automáticamente el sensor.
    // ------------------------------------------------------------

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
        {
          sensorId: sensor.id,
          nombre: sensor.nombre,
        },
        empresaId,
      );
    }

    // ------------------------------------------------------------
    // HU-31:
    // Toda lectura válida del sensor (haya estado ACTIVO, INACTIVO
    // o FALLA) resuelve cualquier alerta de desconexión abierta.
    // No se limita al caso "noEstabaActivo" porque la desconexión
    // es ortogonal al estado del sensor: puede seguir figurando
    // ACTIVO y aun así llevar rato sin mandar datos hasta que el
    // cron detecta el corte.
    // ------------------------------------------------------------

    this.notificacionesService
      .resolverAlertaSensorDesconectado(sensor.id, empresaId)
      .catch((err) =>
        this.logger.error(
          `Error al resolver alerta de desconexión para sensor ${sensor.id}: ${err}`,
        ),
      );

    // ------------------------------------------------------------
    // Response + WebSocket
    // ------------------------------------------------------------

    const responseDto = LecturaMapper.toResponseDto(creada);

    this.lecturasGateway.emitirLectura(responseDto, empresaId);

    // ------------------------------------------------------------
    // HU-25:
    // Evaluación de alerta por umbral.
    //
    // IMPORTANTE:
    // No volvemos a buscar el lote porque ya lo tenemos arriba.
    // Se pasa directamente la materia prima del lote.
    //
    // La alerta de umbral es independiente de:
    // - clasificación del lote
    // - lote no apto
    // - estado físico del sensor
    // ------------------------------------------------------------

    const mapaUmbrales = await this.construirMapaUmbrales(empresaId);

    const umbral = mapaUmbrales.get(`${sensor.parametro}|${lote.materiaPrima}`);

    if (umbral) {
      this.notificacionesService
        .generarAlertaPorUmbral({
          empresaId,
          loteId: lote.id,
          loteCodigo: lote.codigo,
          parametro: sensor.parametro,
          valor: dto.valor,
          umbralMin: umbral.umbralMin,
          umbralMax: umbral.umbralMax,
          timestamp: timestampLectura,
          materiaPrima: lote.materiaPrima,
        })
        .catch((err) =>
          this.logger.error(
            `Error al generar alerta de umbral para lote ${lote.id}: ${err}`,
          ),
        );
    }

    // ------------------------------------------------------------
    // HU-21:
    // Clasificación automática del lote.
    //
    // Best-effort: si falla la clasificación no debe romper
    // la ingesta de la lectura.
    // ------------------------------------------------------------

    this.clasificacionLoteService
      .evaluarYClasificar(lote.id, empresaId)
      .catch((err) =>
        this.logger.error(`Error al clasificar lote ${lote.id}: ${err}`),
      );

    // ------------------------------------------------------------
    // HU-50:
    // Detección de anomalías respecto al histórico reciente del mismo
    // lote+parámetro. Best-effort, no debe romper la ingesta.
    // Caso A/B del diseño: lote con sensor asociado (funcionando o en
    // fallback), la serie sale de sensor_lecturas.
    // ------------------------------------------------------------

    this.evaluarAnomaliaBestEffort(
      empresaId,
      lote.id,
      lote.codigo,
      sensor.parametro,
      dto.valor,
    );

    return responseDto;
  }

  // ============================================================
  // INGRESO MANUAL
  // ============================================================

  // HU-15:
  // Permite cargar manualmente una medición cuando el sensor
  // está INACTIVO o en FALLA.
  //
  // La carga manual NO modifica:
  // - sensor.estado
  // - sensor.ultimaLectura
  //
  // La recuperación del sensor solamente ocurre cuando el propio
  // sensor vuelve a enviar una lectura automática válida.
  //
  // HU-31: tampoco resuelve la alerta de desconexión — una carga
  // manual es el fallback cuando el sensor no anda, no representa
  // "reanudar el envío de datos" (AC 4 de la HU-31).

  async ingresarManual(
    dto: IngresarLecturaManualDto,
    usuarioId: number,
    tenant: TenantContext,
  ) {
    const empresaId = this.resolveEmpresaId(tenant);

    // ------------------------------------------------------------
    // Sensor
    // ------------------------------------------------------------

    const sensor = await this.sensorRepository.findOne(dto.sensorId, empresaId);

    if (!sensor) {
      throw new NotFoundException(`Sensor ${dto.sensorId} no encontrado.`);
    }

    // ------------------------------------------------------------
    // Criterio HU-15:
    // solamente se permite carga manual si el sensor NO está ACTIVO.
    // ------------------------------------------------------------

    if (sensor.estado === EstadoSensor.ACTIVO) {
      throw new BadRequestException(
        `El sensor "${sensor.nombre}" está activo: no se permite carga manual mientras reporta con normalidad.`,
      );
    }

    // ------------------------------------------------------------
    // Asociación actual sensor -> lote
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Obtener lote
    //
    // Necesario para:
    // - código
    // - materia prima
    // - HU-25
    // ------------------------------------------------------------

    const lote = await this.loteRepository.findById(loteId, empresaId);

    if (!lote) {
      throw new NotFoundException(`Lote ${loteId} no encontrado.`);
    }

    // ------------------------------------------------------------
    // Criterio 3 HU-15:
    // rango físico
    // ------------------------------------------------------------

    const rango = RANGOS_FISICOS[sensor.parametro];

    if (rango && (dto.valor < rango.min || dto.valor > rango.max)) {
      throw new UnprocessableEntityException(
        `El valor ${dto.valor} está fuera del rango físico posible para ${sensor.parametro} (${rango.min}-${rango.max}).`,
      );
    }

    // ------------------------------------------------------------
    // Persistencia
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // WebSocket
    // ------------------------------------------------------------

    const responseDto = LecturaMapper.toResponseDto(creada);

    this.lecturasGateway.emitirLectura(responseDto, empresaId);

    // ------------------------------------------------------------
    // HU-25:
    // alerta de umbral también para lecturas manuales.
    //
    // Se utiliza directamente el lote que acabamos de obtener.
    // No se hace otra consulta dentro de la generación de alerta.
    // ------------------------------------------------------------

    const mapaUmbrales = await this.construirMapaUmbrales(empresaId);

    const umbral = mapaUmbrales.get(`${sensor.parametro}|${lote.materiaPrima}`);

    if (umbral) {
      this.notificacionesService
        .generarAlertaPorUmbral({
          empresaId,
          loteId: lote.id,
          loteCodigo: lote.codigo,
          parametro: sensor.parametro,
          valor: dto.valor,
          umbralMin: umbral.umbralMin,
          umbralMax: umbral.umbralMax,
          timestamp,
          materiaPrima: lote.materiaPrima,
        })
        .catch((err) =>
          this.logger.error(
            `Error al generar alerta de umbral para lectura manual del lote ${lote.id}: ${err}`,
          ),
        );
    }

    // ------------------------------------------------------------
    // HU-21:
    // clasificación automática
    // ------------------------------------------------------------

    this.clasificacionLoteService
      .evaluarYClasificar(loteId, empresaId)
      .catch((err) =>
        this.logger.error(`Error al clasificar lote ${loteId}: ${err}`),
      );

    // ------------------------------------------------------------
    // HU-50:
    // Detección de anomalías. Best-effort, no debe romper la carga
    // manual. Caso B del diseño: sensor asociado pero en falla/inactivo,
    // fallback manual — la serie igual sale de sensor_lecturas, solo
    // cambia el origen del punto (MANUAL en vez de SENSOR).
    // ------------------------------------------------------------

    this.evaluarAnomaliaBestEffort(
      empresaId,
      loteId,
      lote.codigo,
      sensor.parametro,
      dto.valor,
    );

    return responseDto;
  }

  // ============================================================
  // EVENTOS DE SENSOR
  // ============================================================

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

  // ============================================================
  // HU-19: HISTORIAL
  // ============================================================

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
        return {
          data: [],
          total: 0,
          page,
          limit,
          rangoAmplio: false,
        };
      }

      loteId = lote.id;
    }

    const [lecturas, total] = await this.lecturaRepository.findHistorial(
      {
        loteId,
        fechaInicio,
        fechaFin,
        page,
        limit,
      },
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

    // ------------------------------------------------------------
    // HU-63:
    // solamente GERENTE puede consultar trazabilidad de auditoría.
    // ------------------------------------------------------------

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

  // ============================================================
  // HU-19: EXPORTACIÓN
  // ============================================================

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
      {
        loteId,
        fechaInicio,
        fechaFin,
      },
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

  // ============================================================
  // UTILIDADES DE FECHAS
  // ============================================================

  private normalizarFechaFin(fechaFin?: string): Date | undefined {
    if (!fechaFin) {
      return undefined;
    }

    const fecha = new Date(fechaFin);

    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      fecha.setUTCHours(23, 59, 59, 999);
    }

    return fecha;
  }

  private esRangoAmplio(fechaInicio?: Date, fechaFin?: Date): boolean {
    if (!fechaInicio || !fechaFin) {
      return false;
    }

    const dias =
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24);

    return dias > RANGO_DIAS_SLA;
  }

  // ============================================================
  // CONFIGURACIÓN DE UMBRALES
  // ============================================================
  private async construirMapaUmbrales(
    empresaId: number,
  ): Promise<Map<string, { umbralMin: number; umbralMax: number }>> {
    const configs = await this.configParametroRepository.find({
      where: { empresaId },
    });
    const mapa = new Map<string, { umbralMin: number; umbralMax: number }>();
    for (const config of configs) {
      mapa.set(`${config.parametro}|${config.tipoMateriaPrima}`, {
        umbralMin: config.umbralMin,
        umbralMax: config.umbralMax,
      });
    }
    return mapa;
  }

  // ============================================================
  // ESTADO DE MEDICIÓN
  // ============================================================
  private calcularEstado(
    valor: number,
    parametro: Parametro,
    materiaPrima: TipoMateriaPrima,
    mapa: Map<string, { umbralMin: number; umbralMax: number }>,
  ): EstadoMedicion {
    const umbral = mapa.get(`${parametro}|${materiaPrima}`);
    if (!umbral) return EstadoMedicion.SIN_UMBRAL_CONFIGURADO;
    if (valor < umbral.umbralMin || valor > umbral.umbralMax)
      return EstadoMedicion.FUERA_DE_RANGO;
    return EstadoMedicion.NORMAL;
  }

  // ============================================================
  // CSV
  // ============================================================
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