import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { TenantContext } from '../../common/types/tenant-context.type';

import type { ISensorRepository } from '../sensor/repository/sensor.repository.interface';
import { SENSOR_REPOSITORY } from '../sensor/repository/sensor.repository.interface';
import type { ISensorLoteHistorialRepository } from '../sensor/repository/sensor-lote-historial.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../sensor/repository/sensor-lote-historial.repository.interface';
import { SensorService } from '../sensor/sensor.service';
import type { Sensor } from '../sensor/entities/sensor.entity';
import { EstadoSensor } from '../sensor/enums/estado-sensor.enum';

import type { ILoteRepository } from '../lote/repository/lote-repository.interface';
import { LOTE_REPOSITORY } from '../lote/repository/lote-repository.interface';
import { LoteService } from '../lote/lote.service';
import { LoteTrazabilidadService } from '../lote/lote-trazabilidad.service';
import { ClasificacionLoteService } from '../lote/clasificacion-lote.service';
import { ClasificacionLote } from '../lote/enums/clasificacion-lote.enum';
import type { Lote } from '../lote/entities/lote.entity';

import { LecturaSensorService } from '../lectura-sensor/lectura-sensor.service';
import { MlService } from '../ml/ml.service';

import { Parametro } from '../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../config-parametro/enums/tipo-materia-prima-enum';
import { RANGOS_FISICOS } from '../config-parametro/validators/rangos-fisicos.constant';
import type { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';

import type {
  IDemoRepository,
  LecturaDemo,
  LoteDemo,
} from './repository/demo.repository.interface';
import { DEMO_REPOSITORY } from './repository/demo.repository.interface';
import { DemoConfig, leerConfigDemo } from './demo.config';
import {
  DEMO_CANTIDAD_LOTE,
  DEMO_OCUPANTE_LIBRE,
  DEMO_PATRON_NOMBRE_SENSOR,
  DEMO_PREFIJO_CODIGO_LOTE,
  DEMO_SEGUNDOS_VENCIMIENTO_TURNO,
  DEMO_TABLERO_CACHE_MS,
  DEMO_TEMPERATURA_INICIAL_DEFAULT,
} from './constants/demo.constants';
import { IniciarTurnoDemoDto } from './dto/iniciar-turno-demo.dto';
import { RegistrarLecturaDemoDto } from './dto/registrar-lectura-demo.dto';
import { TurnoDemoResponseDto } from './dto/turno-demo-response.dto';
import {
  EstadoFinalDemo,
  ResumenTurnoDemoResponseDto,
} from './dto/resumen-turno-demo-response.dto';
import {
  SemaforoDemo,
  SensorTableroDemoDto,
  TableroDemoResponseDto,
} from './dto/tablero-demo-response.dto';

const ESTADO_POR_CLASIFICACION: Record<ClasificacionLote, EstadoFinalDemo> = {
  [ClasificacionLote.APTO]: 'APTO',
  [ClasificacionLote.NO_APTO]: 'NO_APTO',
};

interface NombreSensorDemo {
  numero: number;
  ocupante: string;
}

// Demo en vivo: el celular de cada visitante actúa como sensor de un lote
// de la empresa demo. No reimplementa nada del flujo real: crea el lote con
// LoteService, asocia con SensorService y cada lectura entra por
// LecturaSensorService.ingresar() (umbrales, alertas, clasificación,
// anomalías y WebSocket). Todo corre con el tenant de DEMO_EMPRESA_ID.
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private readonly config: DemoConfig;

  // Sensores con una toma en curso (memoria: corre una sola instancia).
  // Entre el UPDATE del nombre y la asociación al lote nuevo (hasta ~3 s
  // por la IA), la última asociación del sensor sigue siendo la del turno
  // anterior: un /fin tardío de ese turno lo liberaría. /fin saltea los
  // sensores marcados.
  private readonly tomasEnCurso = new Set<number>();

  private tableroCache: {
    expiraEn: number;
    respuesta: Promise<TableroDemoResponseDto>;
  } | null = null;

  constructor(
    configService: ConfigService,
    @Inject(SENSOR_REPOSITORY)
    private readonly sensorRepository: ISensorRepository,
    @Inject(SENSOR_LOTE_HISTORIAL_REPOSITORY)
    private readonly historialRepository: ISensorLoteHistorialRepository,
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @Inject(DEMO_REPOSITORY)
    private readonly demoRepository: IDemoRepository,
    private readonly sensorService: SensorService,
    private readonly loteService: LoteService,
    private readonly loteTrazabilidadService: LoteTrazabilidadService,
    private readonly clasificacionLoteService: ClasificacionLoteService,
    private readonly lecturaSensorService: LecturaSensorService,
    private readonly mlService: MlService,
  ) {
    this.config = leerConfigDemo(configService);
  }

  // rolNombre null: nunca es acceso global, TenantScopedRepository y los
  // services filtran siempre por la empresa demo.
  private get tenant(): TenantContext {
    return { empresaId: this.config.empresaId, rolNombre: null };
  }

  // ============================================================
  // POST /demo/turno
  // ============================================================

  async iniciarTurno(dto: IniciarTurnoDemoDto): Promise<TurnoDemoResponseDto> {
    // sensorId null o ausente → asignación automática (@Min(1) descarta el 0).
    return dto.sensorId
      ? this.iniciarTurnoEnSensor(dto.sensorId, dto.nombre)
      : this.iniciarTurnoEnSensorDisponible(dto.nombre);
  }

  // Con sensorId: el visitante eligió el sensor.
  private async iniciarTurnoEnSensor(
    sensorId: number,
    nombreVisitante: string,
  ): Promise<TurnoDemoResponseDto> {
    const sensor = await this.sensorRepository.findOne(
      sensorId,
      this.config.empresaId,
    );
    if (!sensor) {
      throw new NotFoundException(
        `Sensor ${sensorId} no encontrado en la empresa demo.`,
      );
    }

    const nombreActual = this.parsearNombre(sensor.nombre);
    if (!nombreActual) {
      throw new ConflictException(
        `El sensor "${sensor.nombre}" no es un sensor de demo (se espera "Sensor N · ${DEMO_OCUPANTE_LIBRE}").`,
      );
    }
    if (sensor.parametro !== Parametro.TEMPERATURA) {
      throw new ConflictException(
        `El sensor "${sensor.nombre}" no mide temperatura y no sirve para la demo.`,
      );
    }
    // asociarALote exige ACTIVO: se rechaza antes de renombrar el sensor y
    // crear un lote que quedaría sin turno.
    if (sensor.estado !== EstadoSensor.ACTIVO) {
      throw new ConflictException(
        `El sensor "${sensor.nombre}" no está activo (estado: ${sensor.estado}). Probá con otro.`,
      );
    }
    if (nombreActual.ocupante !== DEMO_OCUPANTE_LIBRE) {
      await this.validarTurnoAbandonado(sensor);
    }

    const turno = await this.intentarTomar(
      sensor,
      nombreActual,
      nombreVisitante,
    );
    if (!turno) {
      throw new ConflictException(
        `El sensor "${sensor.nombre}" acaba de ser tomado por otra persona.`,
      );
    }
    return turno;
  }

  // Sin sensorId: se asigna el sensor disponible (libre o con el turno
  // vencido) de menor N. Los candidatos salen de dos consultas fijas
  // (sensores + última asociación de cada uno). Si otro visitante gana un
  // candidato entre la lectura y el UPDATE, se prueba con el siguiente.
  private async iniciarTurnoEnSensorDisponible(
    nombreVisitante: string,
  ): Promise<TurnoDemoResponseDto> {
    const empresaId = this.config.empresaId;

    const sensores = (
      await this.sensorRepository.findAll(
        { parametro: Parametro.TEMPERATURA },
        empresaId,
      )
    )
      .map((sensor) => ({ sensor, nombre: this.parsearNombre(sensor.nombre) }))
      .filter(
        (s): s is { sensor: Sensor; nombre: NombreSensorDemo } =>
          s.nombre !== null,
      )
      .sort((a, b) => a.nombre.numero - b.nombre.numero);

    const asociaciones = await this.historialRepository.findUltimosPorSensores(
      sensores.map((s) => s.sensor.id),
      empresaId,
    );
    const fechaAsociacionPorSensor = new Map(
      asociaciones.map((a) => [a.sensorId, a.fecha]),
    );

    for (const { sensor, nombre } of sensores) {
      const fechaAsociacion = fechaAsociacionPorSensor.get(sensor.id) ?? null;
      if (!this.estaDisponible(sensor, nombre, fechaAsociacion)) continue;

      if (nombre.ocupante !== DEMO_OCUPANTE_LIBRE) {
        this.logger.warn(
          `Turno abandonado en "${sensor.nombre}" (id ${sensor.id}): se reasigna.`,
        );
      }
      const turno = await this.intentarTomar(sensor, nombre, nombreVisitante);
      if (turno) return turno;
    }

    throw new ConflictException('Todos los sensores están en uso');
  }

  // Toma el sensor y le crea el lote. Devuelve null si otro turno lo ganó
  // (toma en curso o UPDATE condicional sin filas); cualquier otro error
  // se propaga, con el sensor de vuelta en "· libre".
  private async intentarTomar(
    sensor: Sensor,
    nombreActual: NombreSensorDemo,
    nombreVisitante: string,
  ): Promise<TurnoDemoResponseDto | null> {
    // Se marca ANTES del UPDATE: un /fin que lea el nombre nuevo ya ve la
    // marca, y uno que leyó el nombre viejo falla en su UPDATE condicional.
    if (this.tomasEnCurso.has(sensor.id)) return null;
    this.tomasEnCurso.add(sensor.id);

    try {
      // Toma atómica: el nombre solo cambia si sigue siendo el que se leyó
      // ("· libre" o el del turno vencido). Si otro turno lo tomó en el
      // medio, el UPDATE afecta 0 filas. Recién después se crea el lote.
      const nombreTomado = this.nombreSensor(
        nombreActual.numero,
        nombreVisitante,
      );
      const tomado = await this.demoRepository.reemplazarNombreSensor(
        sensor.id,
        this.config.empresaId,
        sensor.nombre,
        nombreTomado,
      );
      if (!tomado) return null;

      try {
        const loteId = await this.crearLoteYAsociar(sensor.id);
        this.logger.log(
          `Turno demo iniciado: sensor ${sensor.id} → lote ${loteId}`,
        );
        return { loteId, sensorId: sensor.id, numero: nombreActual.numero };
      } catch (err) {
        await this.liberarSensorTomado(
          sensor.id,
          nombreActual.numero,
          nombreTomado,
        );
        throw err;
      }
    } finally {
      this.tomasEnCurso.delete(sensor.id);
    }
  }

  private async crearLoteYAsociar(sensorId: number): Promise<number> {
    const codigo = `${DEMO_PREFIJO_CODIGO_LOTE}${sensorId}-${Date.now()}`;
    const { lote } = await this.loteService.create(
      {
        codigo,
        proveedorId: this.config.proveedorId,
        tamboId: this.config.tamboId,
        materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
        fechaIngreso: new Date().toISOString(),
        // Solo temperatura: la clasificación depende únicamente de las
        // lecturas del juego, sin parámetros de respaldo.
        parametros: [
          {
            parametro: Parametro.TEMPERATURA,
            valor: await this.temperaturaInicial(),
          },
        ],
        cantidad: DEMO_CANTIDAD_LOTE,
        numeroRemito: codigo,
      },
      this.tenant,
    );

    await this.sensorService.asociarALote(
      lote.id,
      [sensorId],
      this.config.usuarioId,
      this.tenant,
    );

    return lote.id;
  }

  // Compensación si falla crear o asociar el lote: el sensor vuelve a
  // "· libre", condicionado a que siga con el nombre que se le puso. Si la
  // falla fue después de crear el lote, ese lote queda sin turno (no se
  // borra). El error de la compensación se loguea y no tapa el original.
  private async liberarSensorTomado(
    sensorId: number,
    numero: number,
    nombreTomado: string,
  ): Promise<void> {
    try {
      await this.demoRepository.reemplazarNombreSensor(
        sensorId,
        this.config.empresaId,
        nombreTomado,
        this.nombreSensor(numero, DEMO_OCUPANTE_LIBRE),
      );
    } catch (err) {
      this.logger.error(
        `No se pudo liberar el sensor ${sensorId} tras un turno fallido: ${err}`,
      );
    }
  }

  // ============================================================
  // POST /demo/lecturas
  // ============================================================

  async registrarLectura(dto: RegistrarLecturaDemoDto) {
    const lote = await this.buscarLoteDemo(dto.loteId);

    const sensor = await this.sensorRepository.findOne(
      dto.sensorId,
      this.config.empresaId,
    );
    if (!sensor) {
      throw new NotFoundException(
        `Sensor ${dto.sensorId} no encontrado en la empresa demo.`,
      );
    }

    // La asociación sensor → lote no se borra al terminar el turno: el
    // nombre "· libre" es lo que marca que ya no se aceptan lecturas.
    const nombre = this.parsearNombre(sensor.nombre);
    if (!nombre || nombre.ocupante === DEMO_OCUPANTE_LIBRE) {
      throw new ConflictException('El turno de este sensor ya terminó.');
    }

    // Se rechaza acá y no en la ingesta: allá un valor fuera del rango
    // físico deja el sensor en FALLA y no se podría asociar al próximo turno.
    const rango = RANGOS_FISICOS[sensor.parametro];
    if (rango && (dto.valor < rango.min || dto.valor > rango.max)) {
      throw new BadRequestException(
        `El valor ${dto.valor} está fuera del rango físico posible para ${sensor.parametro} (${rango.min}-${rango.max}).`,
      );
    }

    // La ingesta identifica sensor y lote por nombre y código (contrato
    // del PLC), no por id.
    return this.lecturaSensorService.ingresar(
      {
        sensor_id: sensor.nombre,
        lote_id: lote.codigo,
        valor: dto.valor,
        timestamp: new Date().toISOString(),
      },
      this.tenant,
    );
  }

  // ============================================================
  // POST /demo/turno/:loteId/fin
  // ============================================================

  async finalizarTurno(loteId: number): Promise<ResumenTurnoDemoResponseDto> {
    const empresaId = this.config.empresaId;
    const lote = await this.buscarLoteDemo(loteId);

    const turnoAbierto = await this.liberarSensoresDeLote(lote.id);

    // Sincrónico (en la ingesta corre fire-and-forget) para que el resumen
    // salga con la clasificación de la última lectura.
    await this.clasificacionLoteService.evaluarYClasificar(lote.id, empresaId);

    const lecturas = await this.demoRepository.findLecturasDeLotes(
      [lote.id],
      empresaId,
    );

    // Una sola recomendación por turno: si /fin se repite (reintento del
    // frontend), el turno ya está cerrado y no se vuelve a generar.
    if (turnoAbierto) {
      await this.generarRecomendacionBestEffort(lote.id, lecturas);
    }

    return this.construirResumen(lote.id, lecturas);
  }

  // ============================================================
  // GET /demo/lotes/:id/resumen (solo lectura)
  // ============================================================

  async obtenerResumen(loteId: number): Promise<ResumenTurnoDemoResponseDto> {
    const lote = await this.buscarLoteDemo(loteId);
    const lecturas = await this.demoRepository.findLecturasDeLotes(
      [lote.id],
      this.config.empresaId,
    );
    return this.construirResumen(lote.id, lecturas);
  }

  // ============================================================
  // GET /demo/tablero (solo lectura, la tele lo pide cada 1-2 s)
  // ============================================================

  // Cache en memoria de la respuesta completa: aunque lo pidan varias
  // pantallas (o alguien lo spamee), la base recibe como mucho una
  // corrida de calcularTablero() por segundo. Se cachea la promesa, así
  // los pedidos simultáneos comparten la misma corrida; si falla, no se
  // cachea el error.
  obtenerTablero(): Promise<TableroDemoResponseDto> {
    const ahora = Date.now();
    if (this.tableroCache && this.tableroCache.expiraEn > ahora) {
      return this.tableroCache.respuesta;
    }

    const respuesta = this.calcularTablero();
    this.tableroCache = { expiraEn: ahora + DEMO_TABLERO_CACHE_MS, respuesta };
    respuesta.catch(() => {
      if (this.tableroCache?.respuesta === respuesta) {
        this.tableroCache = null;
      }
    });
    return respuesta;
  }

  // Seis consultas en total, sin importar cuántos sensores haya: sensores,
  // última asociación de cada uno, y en paralelo lotes, lecturas, alertas
  // y umbral. Para un sensor libre, o con un turno vencido, se muestran
  // los datos de su último turno (ocupado = false).
  private async calcularTablero(): Promise<TableroDemoResponseDto> {
    const empresaId = this.config.empresaId;

    const sensores = (
      await this.sensorRepository.findAll(
        { parametro: Parametro.TEMPERATURA },
        empresaId,
      )
    )
      .map((sensor) => ({ sensor, nombre: this.parsearNombre(sensor.nombre) }))
      .filter(
        (s): s is { sensor: Sensor; nombre: NombreSensorDemo } =>
          s.nombre !== null,
      )
      .sort((a, b) => a.nombre.numero - b.nombre.numero);

    const asociaciones = await this.historialRepository.findUltimosPorSensores(
      sensores.map((s) => s.sensor.id),
      empresaId,
    );
    const asociacionPorSensor = new Map(
      asociaciones.map((a) => [a.sensorId, a]),
    );
    const loteIds = [...new Set(asociaciones.map((a) => a.loteIdNuevo))];

    const [lotes, lecturas, alertasPorLote, umbrales] = await Promise.all([
      this.demoRepository.findLotes(loteIds, empresaId),
      this.demoRepository.findLecturasDeLotes(loteIds, empresaId),
      this.demoRepository.contarAlertasPorLote(loteIds, empresaId),
      this.demoRepository.findUmbrales(empresaId, TipoMateriaPrima.LECHE_CRUDA),
    ]);

    const lotePorId = new Map(
      lotes
        .filter((l) => l.codigo.startsWith(DEMO_PREFIJO_CODIGO_LOTE))
        .map((l) => [l.id, l]),
    );
    const lecturasPorLote = new Map<number, LecturaDemo[]>();
    for (const lectura of lecturas) {
      const delLote = lecturasPorLote.get(lectura.loteId) ?? [];
      delLote.push(lectura);
      lecturasPorLote.set(lectura.loteId, delLote);
    }
    const umbral = umbrales.find((u) => u.parametro === Parametro.TEMPERATURA);

    return {
      umbral: umbral
        ? { min: Number(umbral.umbralMin), max: Number(umbral.umbralMax) }
        : null,
      sensores: sensores.map(({ sensor, nombre }) => {
        const asociacion = asociacionPorSensor.get(sensor.id);
        const lote = asociacion
          ? lotePorId.get(asociacion.loteIdNuevo)
          : undefined;
        return this.filaTablero(
          sensor,
          nombre,
          asociacion?.fecha ?? null,
          lote ?? null,
          lote ? (lecturasPorLote.get(lote.id) ?? []) : [],
          lote ? (alertasPorLote.get(lote.id) ?? 0) : 0,
          umbrales,
        );
      }),
    };
  }

  private filaTablero(
    sensor: Sensor,
    nombre: NombreSensorDemo,
    fechaAsociacion: Date | null,
    lote: LoteDemo | null,
    lecturas: LecturaDemo[],
    alertas: number,
    umbrales: ConfiguracionParametro[],
  ): SensorTableroDemoDto {
    const ultima = lecturas[lecturas.length - 1];
    const umbral = umbrales.find((u) => u.parametro === sensor.parametro);

    let semaforo: SemaforoDemo | null = null;
    if (ultima && umbral) {
      const fuera =
        ultima.valor < Number(umbral.umbralMin) ||
        ultima.valor > Number(umbral.umbralMax);
      semaforo = fuera ? 'FUERA_DE_RANGO' : 'EN_RANGO';
    }

    return {
      id: sensor.id,
      nombre: sensor.nombre,
      estado: sensor.estado,
      ocupado: this.estaOcupado(sensor, nombre, fechaAsociacion),
      disponible: this.estaDisponible(sensor, nombre, fechaAsociacion),
      lote: lote ? { id: lote.id, codigo: lote.codigo } : null,
      ultimaTemperatura: ultima?.valor ?? null,
      ultimaLecturaEn: ultima?.timestampLectura ?? null,
      semaforo,
      clasificacion: lote?.clasificacion
        ? ESTADO_POR_CLASIFICACION[lote.clasificacion]
        : null,
      desvios: this.contarEpisodiosDeDesvio(lecturas, umbrales),
      alertas,
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async buscarLoteDemo(loteId: number): Promise<Lote> {
    const lote = await this.loteRepository.findById(
      loteId,
      this.config.empresaId,
    );
    if (!lote || !lote.codigo.startsWith(DEMO_PREFIJO_CODIGO_LOTE)) {
      throw new NotFoundException(`Lote ${loteId} no encontrado en la demo.`);
    }
    return lote;
  }

  private parsearNombre(nombre: string): NombreSensorDemo | null {
    const match = DEMO_PATRON_NOMBRE_SENSOR.exec(nombre);
    if (!match) return null;
    return { numero: Number(match[1]), ocupante: match[2] };
  }

  private nombreSensor(numero: number, ocupante: string): string {
    return `Sensor ${numero} · ${ocupante}`;
  }

  // Para el tablero, con el mismo criterio que POST /demo/turno: un
  // sensor con visitante cuyo turno venció se muestra libre (se puede
  // tomar). Con una toma en curso se muestra ocupado: el nombre ya cambió
  // pero la asociación nueva todavía no existe, así que la fecha de la
  // vieja lo daría por vencido.
  private estaOcupado(
    sensor: Sensor,
    nombre: NombreSensorDemo,
    fechaAsociacion: Date | null,
  ): boolean {
    if (nombre.ocupante === DEMO_OCUPANTE_LIBRE) return false;
    if (this.tomasEnCurso.has(sensor.id)) return true;
    return !this.turnoVencido(sensor, fechaAsociacion);
  }

  // Mismo criterio para la asignación automática y para `disponible` del
  // tablero: asociarALote exige ACTIVO, así que un sensor inactivo o en
  // falla no se puede tomar aunque no tenga turno.
  private estaDisponible(
    sensor: Sensor,
    nombre: NombreSensorDemo,
    fechaAsociacion: Date | null,
  ): boolean {
    return (
      sensor.estado === EstadoSensor.ACTIVO &&
      !this.estaOcupado(sensor, nombre, fechaAsociacion)
    );
  }

  // Un turno ocupado se puede tomar si lleva más de 60 s sin actividad.
  // Actividad = la última lectura del sensor o, si el turno todavía no
  // tiene lecturas, el momento en que empezó (la última asociación). Se
  // toma la más reciente: ultimaLectura puede ser de un turno anterior.
  private turnoVencido(
    sensor: Sensor,
    fechaAsociacion: Date | null | undefined,
  ): boolean {
    const ultimaActividad = Math.max(
      sensor.ultimaLectura ? new Date(sensor.ultimaLectura).getTime() : 0,
      fechaAsociacion ? new Date(fechaAsociacion).getTime() : 0,
    );
    return (
      Date.now() - ultimaActividad >= DEMO_SEGUNDOS_VENCIMIENTO_TURNO * 1000
    );
  }

  private async validarTurnoAbandonado(sensor: Sensor): Promise<void> {
    const asociacion = await this.historialRepository.findUltimoPorSensor(
      sensor.id,
      this.config.empresaId,
    );

    if (!this.turnoVencido(sensor, asociacion?.fecha)) {
      throw new ConflictException(
        `El sensor "${sensor.nombre}" está en uso. Probá con otro o esperá un minuto.`,
      );
    }

    this.logger.warn(
      `Turno abandonado en "${sensor.nombre}" (id ${sensor.id}): se reasigna.`,
    );
  }

  private async temperaturaInicial(): Promise<number> {
    const umbrales = await this.demoRepository.findUmbrales(
      this.config.empresaId,
      TipoMateriaPrima.LECHE_CRUDA,
    );
    const umbral = umbrales.find((u) => u.parametro === Parametro.TEMPERATURA);
    if (!umbral) return DEMO_TEMPERATURA_INICIAL_DEFAULT;
    return (Number(umbral.umbralMin) + Number(umbral.umbralMax)) / 2;
  }

  // Vuelve a "· libre" los sensores cuya ÚLTIMA asociación es este lote y
  // que siguen con un visitante. Si otro turno ya tomó el sensor (abandono
  // vencido), o lo está tomando ahora, no se toca. Devuelve si liberó
  // alguno: solo en ese caso /fin genera la recomendación.
  private async liberarSensoresDeLote(loteId: number): Promise<boolean> {
    const empresaId = this.config.empresaId;
    const sensorIds = await this.historialRepository.findSensoresActualesDeLote(
      loteId,
      empresaId,
    );

    let turnoAbierto = false;
    for (const sensorId of sensorIds) {
      // Otro visitante ya está tomando este sensor (su lote todavía no
      // quedó asociado): el turno de este lote ya no es dueño del sensor.
      if (this.tomasEnCurso.has(sensorId)) continue;

      const sensor = await this.sensorRepository.findOne(sensorId, empresaId);
      const nombre = sensor ? this.parsearNombre(sensor.nombre) : null;
      if (!sensor || !nombre || nombre.ocupante === DEMO_OCUPANTE_LIBRE) {
        continue;
      }

      const liberado = await this.demoRepository.reemplazarNombreSensor(
        sensor.id,
        empresaId,
        sensor.nombre,
        this.nombreSensor(nombre.numero, DEMO_OCUPANTE_LIBRE),
      );
      turnoAbierto = turnoAbierto || liberado;
    }
    return turnoAbierto;
  }

  // Recomendación con la última lectura de cada parámetro. Si el
  // microservicio no responde, MlService devuelve null; cualquier otro
  // error tampoco debe impedir mostrar el resumen.
  private async generarRecomendacionBestEffort(
    loteId: number,
    lecturas: LecturaDemo[],
  ): Promise<void> {
    const ultimas = new Map<Parametro, number>();
    for (const lectura of lecturas) {
      ultimas.set(lectura.parametro, lectura.valor);
    }
    if (ultimas.size === 0) return;

    try {
      await this.mlService.generarRecomendacion({
        empresaId: this.config.empresaId,
        loteId,
        parametros: [...ultimas].map(([parametro, valor]) => ({
          parametro,
          valor,
        })),
      });
    } catch (err) {
      this.logger.error(
        `Error al generar recomendación demo para lote ${loteId}: ${err}`,
      );
    }
  }

  private async construirResumen(
    loteId: number,
    lecturas: LecturaDemo[],
  ): Promise<ResumenTurnoDemoResponseDto> {
    const empresaId = this.config.empresaId;
    // Se vuelve a leer: /fin acaba de reclasificar.
    const lote = await this.buscarLoteDemo(loteId);

    // La recomendación que genera LoteService.create() usa la temperatura
    // inicial, no el juego: solo cuenta una posterior a la primera lectura.
    const primeraLectura = lecturas[0]?.timestampLectura;

    const [umbrales, alertas, recomendacion, trazabilidad] = await Promise.all([
      this.demoRepository.findUmbrales(empresaId, lote.materiaPrima),
      this.demoRepository.contarAlertasPorLote([lote.id], empresaId),
      primeraLectura
        ? this.demoRepository.findRecomendacionPosteriorA(
            lote.id,
            empresaId,
            primeraLectura,
          )
        : Promise.resolve(null),
      this.loteTrazabilidadService.getTrazabilidad(lote.id, this.tenant),
    ]);

    return {
      loteId: lote.id,
      codigoLote: lote.codigo,
      estado: lote.clasificacion
        ? ESTADO_POR_CLASIFICACION[lote.clasificacion]
        : null,
      desvios: this.contarEpisodiosDeDesvio(lecturas, umbrales),
      alertas: alertas.get(lote.id) ?? 0,
      destinoSugerido: recomendacion
        ? {
            nombre: recomendacion.destinoRecomendado.nombre,
            confianza: recomendacion.confianza,
          }
        : null,
      eventos: trazabilidad.eventos,
    };
  }

  // Episodio = transición de dentro a fuera del umbral (umbralMin/Max, el
  // mismo criterio que la clasificación y la alerta). A 2 lecturas por
  // segundo, un desvío sostenido son muchas lecturas pero un solo episodio.
  // El lote arranca dentro de rango, así que una primera lectura fuera
  // cuenta como episodio.
  private contarEpisodiosDeDesvio(
    lecturas: LecturaDemo[],
    umbrales: ConfiguracionParametro[],
  ): number {
    const umbralPorParametro = new Map(umbrales.map((u) => [u.parametro, u]));
    const fueraPorParametro = new Map<Parametro, boolean>();
    let episodios = 0;

    for (const lectura of lecturas) {
      const umbral = umbralPorParametro.get(lectura.parametro);
      if (!umbral) continue;

      const fuera =
        lectura.valor < Number(umbral.umbralMin) ||
        lectura.valor > Number(umbral.umbralMax);

      if (fuera && !fueraPorParametro.get(lectura.parametro)) {
        episodios++;
      }
      fueraPorParametro.set(lectura.parametro, fuera);
    }

    return episodios;
  }
}
