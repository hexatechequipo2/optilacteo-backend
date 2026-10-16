import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { DemoService } from '../demo.service';
import { DEMO_REPOSITORY } from '../repository/demo.repository.interface';
import type { LecturaDemo } from '../repository/demo.repository.interface';
import { SENSOR_REPOSITORY } from '../../sensor/repository/sensor.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../../sensor/repository/sensor-lote-historial.repository.interface';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { SensorService } from '../../sensor/sensor.service';
import { LoteService } from '../../lote/lote.service';
import { LoteTrazabilidadService } from '../../lote/lote-trazabilidad.service';
import { ClasificacionLoteService } from '../../lote/clasificacion-lote.service';
import { LecturaSensorService } from '../../lectura-sensor/lectura-sensor.service';
import { MlService } from '../../ml/ml.service';

import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../../lote/enums/clasificacion-lote.enum';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { sanitizarNombreVisitante } from '../dto/iniciar-turno-demo.dto';

import type { Sensor } from '../../sensor/entities/sensor.entity';
import type { Lote } from '../../lote/entities/lote.entity';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

const EMPRESA_ID = 7;
const USUARIO_ID = 70;
const PROVEEDOR_ID = 3;
const TAMBO_ID = 4;
const TENANT = { empresaId: EMPRESA_ID, rolNombre: null };

const ENV: Record<string, string> = {
  DEMO_EMPRESA_ID: String(EMPRESA_ID),
  DEMO_USUARIO_ID: String(USUARIO_ID),
  DEMO_PROVEEDOR_ID: String(PROVEEDOR_ID),
  DEMO_TAMBO_ID: String(TAMBO_ID),
};

const UMBRAL_TEMPERATURA = {
  parametro: Parametro.TEMPERATURA,
  tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
  umbralMin: '2.00',
  umbralMax: '6.00',
};

function crearSensor(overrides: Partial<Sensor> = {}): Sensor {
  return {
    id: 1,
    nombre: 'Sensor 1 · libre',
    parametro: Parametro.TEMPERATURA,
    estado: EstadoSensor.ACTIVO,
    empresaId: EMPRESA_ID,
    ultimaLectura: null,
    ...overrides,
  } as Sensor;
}

function crearLote(overrides: Partial<Lote> = {}): Lote {
  return {
    id: 50,
    codigo: 'DEMO-1-1700000000000',
    empresaId: EMPRESA_ID,
    materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
    clasificacion: ClasificacionLote.APTO,
    ...overrides,
  } as Lote;
}

function lecturas(valores: number[], loteId = 50): LecturaDemo[] {
  const inicio = new Date('2026-10-15T10:00:00.000Z').getTime();
  return valores.map((valor, i) => ({
    loteId,
    parametro: Parametro.TEMPERATURA,
    valor,
    timestampLectura: new Date(inicio + i * 500),
  }));
}

describe('DemoService', () => {
  let service: DemoService;

  const sensorRepository = {
    findOne: jest.fn(),
    findByNombre: jest.fn(),
    findAll: jest.fn(),
  };
  const historialRepository = {
    findUltimoPorSensor: jest.fn(),
    findSensoresActualesDeLote: jest.fn(),
    findUltimosPorSensores: jest.fn(),
  };
  const loteRepository = { findById: jest.fn() };
  const demoRepository = {
    findLecturasDeLotes: jest.fn(),
    findLotes: jest.fn(),
    findUmbrales: jest.fn(),
    contarAlertasPorLote: jest.fn(),
    findRecomendacionPosteriorA: jest.fn(),
    reemplazarNombreSensor: jest.fn(),
  };
  const sensorService = { asociarALote: jest.fn() };
  const loteService = { create: jest.fn() };
  const loteTrazabilidadService = { getTrazabilidad: jest.fn() };
  const clasificacionLoteService = { evaluarYClasificar: jest.fn() };
  const lecturaSensorService = { ingresar: jest.fn() };
  const mlService = { generarRecomendacion: jest.fn() };
  const configService = {
    get: jest.fn((clave: string): string | undefined => ENV[clave]),
  };

  async function crearModulo(): Promise<DemoService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoService,
        { provide: ConfigService, useValue: configService },
        { provide: SENSOR_REPOSITORY, useValue: sensorRepository },
        {
          provide: SENSOR_LOTE_HISTORIAL_REPOSITORY,
          useValue: historialRepository,
        },
        { provide: LOTE_REPOSITORY, useValue: loteRepository },
        { provide: DEMO_REPOSITORY, useValue: demoRepository },
        { provide: SensorService, useValue: sensorService },
        { provide: LoteService, useValue: loteService },
        { provide: LoteTrazabilidadService, useValue: loteTrazabilidadService },
        {
          provide: ClasificacionLoteService,
          useValue: clasificacionLoteService,
        },
        { provide: LecturaSensorService, useValue: lecturaSensorService },
        { provide: MlService, useValue: mlService },
      ],
    }).compile();
    return module.get(DemoService);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockImplementation((clave: string) => ENV[clave]);
    demoRepository.findUmbrales.mockResolvedValue([UMBRAL_TEMPERATURA]);
    demoRepository.findLecturasDeLotes.mockResolvedValue([]);
    demoRepository.findLotes.mockResolvedValue([]);
    demoRepository.contarAlertasPorLote.mockResolvedValue(new Map());
    demoRepository.findRecomendacionPosteriorA.mockResolvedValue(null);
    demoRepository.reemplazarNombreSensor.mockResolvedValue(true);
    loteTrazabilidadService.getTrazabilidad.mockResolvedValue({ eventos: [] });
    historialRepository.findSensoresActualesDeLote.mockResolvedValue([]);
    service = await crearModulo();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ------------------------------------------------------------------
  describe('configuración', () => {
    it('falla al construirse si falta una variable DEMO_*', async () => {
      configService.get.mockImplementation((clave: string) =>
        clave === 'DEMO_TAMBO_ID' ? undefined : ENV[clave],
      );
      await expect(crearModulo()).rejects.toThrow('DEMO_TAMBO_ID');
    });
  });

  // ------------------------------------------------------------------
  describe('sanitizarNombreVisitante', () => {
    it('deja solo letras, espacios y guiones, colapsa espacios y recorta a 18', () => {
      expect(sanitizarNombreVisitante('  Ana<script>  María-José 123!! ')).toBe(
        'Anascript María-Jo',
      );
      expect(sanitizarNombreVisitante('Ñandú · ok')).toBe('Ñandú ok');
    });

    it('no toca valores que no son string (los rechaza class-validator)', () => {
      expect(sanitizarNombreVisitante(42)).toBe(42);
    });
  });

  // ------------------------------------------------------------------
  describe('iniciarTurno', () => {
    beforeEach(() => {
      loteService.create.mockResolvedValue({ lote: { id: 50 } });
    });

    it('crea el lote, asocia el sensor y lo renombra con el visitante', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      demoRepository.findUmbrales.mockResolvedValue([
        { ...UMBRAL_TEMPERATURA, umbralMin: '3.00', umbralMax: '7.00' },
      ]);

      const resultado = await service.iniciarTurno({
        sensorId: 1,
        nombre: 'Juan',
      });

      expect(resultado).toEqual({ loteId: 50 });
      expect(sensorRepository.findOne).toHaveBeenCalledWith(1, EMPRESA_ID);

      const [dto, tenant] = loteService.create.mock.calls[0];
      expect(tenant).toEqual(TENANT);
      expect(dto).toMatchObject({
        proveedorId: PROVEEDOR_ID,
        tamboId: TAMBO_ID,
        materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
        parametros: [{ parametro: Parametro.TEMPERATURA, valor: 5 }],
      });
      expect(dto.codigo).toMatch(/^DEMO-1-\d+$/);
      expect(dto.numeroRemito).toBe(dto.codigo);

      expect(sensorService.asociarALote).toHaveBeenCalledWith(
        50,
        [1],
        USUARIO_ID,
        TENANT,
      );
      // Toma condicionada al nombre leído ("· libre").
      expect(demoRepository.reemplazarNombreSensor).toHaveBeenCalledWith(
        1,
        EMPRESA_ID,
        'Sensor 1 · libre',
        'Sensor 1 · Juan',
      );
    });

    it('toma el sensor antes de crear el lote', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      const orden: string[] = [];
      demoRepository.reemplazarNombreSensor.mockImplementation(() => {
        orden.push('tomar');
        return Promise.resolve(true);
      });
      loteService.create.mockImplementation(() => {
        orden.push('crear');
        return Promise.resolve({ lote: { id: 50 } });
      });

      await service.iniciarTurno({ sensorId: 1, nombre: 'Juan' });

      expect(orden).toEqual(['tomar', 'crear']);
    });

    it('409 si otro turno tomó el sensor en el medio (UPDATE con 0 filas), sin crear lote', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      demoRepository.reemplazarNombreSensor.mockResolvedValue(false);

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(loteService.create).not.toHaveBeenCalled();
      expect(sensorService.asociarALote).not.toHaveBeenCalled();
    });

    it('si falla la creación del lote, devuelve el sensor a "· libre" y propaga el error', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      const error = new BadRequestException('proveedor inactivo');
      loteService.create.mockRejectedValue(error);

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
      ).rejects.toBe(error);
      expect(demoRepository.reemplazarNombreSensor).toHaveBeenLastCalledWith(
        1,
        EMPRESA_ID,
        'Sensor 1 · Juan',
        'Sensor 1 · libre',
      );
      expect(sensorService.asociarALote).not.toHaveBeenCalled();
    });

    it('si falla la asociación, también devuelve el sensor a "· libre"', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      sensorService.asociarALote.mockRejectedValueOnce(
        new BadRequestException('sensor no activo'),
      );

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(demoRepository.reemplazarNombreSensor).toHaveBeenLastCalledWith(
        1,
        EMPRESA_ID,
        'Sensor 1 · Juan',
        'Sensor 1 · libre',
      );
    });

    it('409 si el mismo sensor ya tiene una toma en curso en esta instancia', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      let terminarAlta!: (v: unknown) => void;
      loteService.create.mockReturnValueOnce(
        new Promise((resolve) => (terminarAlta = resolve)),
      );

      const primera = service.iniciarTurno({ sensorId: 1, nombre: 'Juan' });
      await new Promise((r) => setImmediate(r));

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Ana' }),
      ).rejects.toBeInstanceOf(ConflictException);

      terminarAlta({ lote: { id: 50 } });
      await expect(primera).resolves.toEqual({ loteId: 50 });
      // Terminada la toma, la marca se libera.
      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Ana' }),
      ).resolves.toEqual({ loteId: 50 });
    });

    it('si la compensación falla, igual propaga el error original', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      const error = new BadRequestException('proveedor inactivo');
      loteService.create.mockRejectedValue(error);
      demoRepository.reemplazarNombreSensor
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('db caída'));

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
      ).rejects.toBe(error);
    });

    it('usa la temperatura por defecto si no hay umbral configurado', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      demoRepository.findUmbrales.mockResolvedValue([]);

      await service.iniciarTurno({ sensorId: 1, nombre: 'Juan' });

      expect(loteService.create.mock.calls[0][0].parametros[0].valor).toBe(4);
    });

    it('404 si el sensor no es de la empresa demo', async () => {
      sensorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.iniciarTurno({ sensorId: 99, nombre: 'Juan' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(loteService.create).not.toHaveBeenCalled();
    });

    it('409 si el nombre del sensor no tiene el formato "Sensor N · ..."', async () => {
      sensorRepository.findOne.mockResolvedValue(
        crearSensor({ nombre: 'TEMP-01' }),
      );

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(loteService.create).not.toHaveBeenCalled();
    });

    it('409 si el sensor no mide temperatura', async () => {
      sensorRepository.findOne.mockResolvedValue(
        crearSensor({ parametro: Parametro.PH }),
      );

      await expect(
        service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    describe('sensor ocupado', () => {
      const AHORA = new Date('2026-10-15T12:00:00.000Z').getTime();

      beforeEach(() => {
        jest.useFakeTimers({ now: AHORA });
      });

      it('409 si la última lectura tiene menos de 60 s', async () => {
        sensorRepository.findOne.mockResolvedValue(
          crearSensor({
            nombre: 'Sensor 1 · Ana',
            ultimaLectura: new Date(AHORA - 10_000),
          }),
        );
        historialRepository.findUltimoPorSensor.mockResolvedValue({
          fecha: new Date(AHORA - 30_000),
        });

        await expect(
          service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(loteService.create).not.toHaveBeenCalled();
      });

      it('409 si el turno empezó hace menos de 60 s y todavía no tiene lecturas (aunque ultimaLectura sea de un turno viejo)', async () => {
        sensorRepository.findOne.mockResolvedValue(
          crearSensor({
            nombre: 'Sensor 1 · Ana',
            ultimaLectura: new Date(AHORA - 3_600_000),
          }),
        );
        historialRepository.findUltimoPorSensor.mockResolvedValue({
          fecha: new Date(AHORA - 5_000),
        });

        await expect(
          service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
        ).rejects.toBeInstanceOf(ConflictException);
      });

      it('permite tomarlo si lleva más de 60 s sin actividad', async () => {
        sensorRepository.findOne.mockResolvedValue(
          crearSensor({
            nombre: 'Sensor 1 · Ana',
            ultimaLectura: new Date(AHORA - 61_000),
          }),
        );
        historialRepository.findUltimoPorSensor.mockResolvedValue({
          fecha: new Date(AHORA - 90_000),
        });

        await expect(
          service.iniciarTurno({ sensorId: 1, nombre: 'Juan' }),
        ).resolves.toEqual({ loteId: 50 });
        // Condicionado al nombre del turno vencido: si otro lo tomó
        // primero, este UPDATE no afecta filas.
        expect(demoRepository.reemplazarNombreSensor).toHaveBeenCalledWith(
          1,
          EMPRESA_ID,
          'Sensor 1 · Ana',
          'Sensor 1 · Juan',
        );
      });
    });
  });

  // ------------------------------------------------------------------
  describe('registrarLectura', () => {
    const dto = { loteId: 50, sensorId: 1, valor: 4.5 };

    beforeEach(() => {
      loteRepository.findById.mockResolvedValue(crearLote());
      sensorRepository.findOne.mockResolvedValue(
        crearSensor({ nombre: 'Sensor 1 · Juan' }),
      );
      lecturaSensorService.ingresar.mockResolvedValue({ id: 1 });
    });

    it('delega en LecturaSensorService.ingresar con el nombre del sensor y el código del lote', async () => {
      const resultado = await service.registrarLectura(dto);

      expect(resultado).toEqual({ id: 1 });
      const [ingesta, tenant] = lecturaSensorService.ingresar.mock.calls[0];
      expect(tenant).toEqual(TENANT);
      expect(ingesta).toMatchObject({
        sensor_id: 'Sensor 1 · Juan',
        lote_id: 'DEMO-1-1700000000000',
        valor: 4.5,
      });
      expect(Number.isNaN(Date.parse(ingesta.timestamp as string))).toBe(false);
    });

    it('404 si el lote no es un lote demo', async () => {
      loteRepository.findById.mockResolvedValue(
        crearLote({ codigo: 'LOTE-7-00001' }),
      );

      await expect(service.registrarLectura(dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(lecturaSensorService.ingresar).not.toHaveBeenCalled();
    });

    it('409 si el turno ya terminó (sensor libre)', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());

      await expect(service.registrarLectura(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(lecturaSensorService.ingresar).not.toHaveBeenCalled();
    });

    it('400 si el valor está fuera del rango físico, sin llegar a la ingesta', async () => {
      await expect(
        service.registrarLectura({ ...dto, valor: 150 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(lecturaSensorService.ingresar).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  describe('finalizarTurno', () => {
    beforeEach(() => {
      loteRepository.findById.mockResolvedValue(crearLote());
      historialRepository.findSensoresActualesDeLote.mockResolvedValue([1]);
      sensorRepository.findOne.mockResolvedValue(
        crearSensor({ nombre: 'Sensor 1 · Juan' }),
      );
    });

    it('libera el sensor, clasifica sincrónicamente y genera la recomendación con la última lectura', async () => {
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4, 7, 5]));

      await service.finalizarTurno(50);

      expect(demoRepository.reemplazarNombreSensor).toHaveBeenCalledWith(
        1,
        EMPRESA_ID,
        'Sensor 1 · Juan',
        'Sensor 1 · libre',
      );
      expect(clasificacionLoteService.evaluarYClasificar).toHaveBeenCalledWith(
        50,
        EMPRESA_ID,
      );
      expect(mlService.generarRecomendacion).toHaveBeenCalledWith({
        empresaId: EMPRESA_ID,
        loteId: 50,
        parametros: [{ parametro: Parametro.TEMPERATURA, valor: 5 }],
      });
    });

    it('clasifica antes de construir el resumen', async () => {
      const orden: string[] = [];
      clasificacionLoteService.evaluarYClasificar.mockImplementation(() => {
        orden.push('clasificar');
        return Promise.resolve();
      });
      loteTrazabilidadService.getTrazabilidad.mockImplementation(() => {
        orden.push('resumen');
        return Promise.resolve({ eventos: [] });
      });

      await service.finalizarTurno(50);

      expect(orden).toEqual(['clasificar', 'resumen']);
    });

    it('no vuelve a generar recomendación si el turno ya estaba cerrado', async () => {
      sensorRepository.findOne.mockResolvedValue(crearSensor());
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4]));

      await service.finalizarTurno(50);

      expect(demoRepository.reemplazarNombreSensor).not.toHaveBeenCalled();
      expect(mlService.generarRecomendacion).not.toHaveBeenCalled();
    });

    it('si dos /fin compiten, solo el que libera el sensor genera la recomendación', async () => {
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4]));
      demoRepository.reemplazarNombreSensor.mockResolvedValue(false);

      await service.finalizarTurno(50);

      expect(mlService.generarRecomendacion).not.toHaveBeenCalled();
    });

    it('si la última asociación del sensor ya no es este lote, devuelve el resumen sin tocar el sensor', async () => {
      historialRepository.findSensoresActualesDeLote.mockResolvedValue([]);
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4]));

      const resumen = await service.finalizarTurno(50);

      expect(resumen.loteId).toBe(50);
      expect(sensorRepository.findOne).not.toHaveBeenCalled();
      expect(demoRepository.reemplazarNombreSensor).not.toHaveBeenCalled();
      expect(mlService.generarRecomendacion).not.toHaveBeenCalled();
    });

    it('un /fin tardío no libera un sensor que otro visitante está tomando (antes de que quede asociado)', async () => {
      // Turno abandonado: el sensor sigue asociado al lote 50 (viejo) y
      // otro visitante lo está tomando; su lote todavía se está creando.
      const AHORA = new Date('2026-10-15T12:00:00.000Z').getTime();
      jest.useFakeTimers({ now: AHORA, doNotFake: ['setImmediate'] });
      sensorRepository.findOne.mockResolvedValue(
        crearSensor({
          nombre: 'Sensor 1 · Ana',
          ultimaLectura: new Date(AHORA - 120_000),
        }),
      );
      historialRepository.findUltimoPorSensor.mockResolvedValue({
        fecha: new Date(AHORA - 180_000),
      });
      let terminarAlta!: (v: unknown) => void;
      loteService.create.mockReturnValueOnce(
        new Promise((resolve) => (terminarAlta = resolve)),
      );
      const toma = service.iniciarTurno({ sensorId: 1, nombre: 'Juan' });
      await new Promise((r) => setImmediate(r));
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4]));

      await service.finalizarTurno(50);

      // Solo el UPDATE de la toma: el /fin no tocó el nombre.
      expect(demoRepository.reemplazarNombreSensor).toHaveBeenCalledTimes(1);
      expect(mlService.generarRecomendacion).not.toHaveBeenCalled();

      terminarAlta({ lote: { id: 60 } });
      await expect(toma).resolves.toEqual({ loteId: 60 });
    });

    it('no genera recomendación si el lote no tiene lecturas', async () => {
      await service.finalizarTurno(50);

      expect(mlService.generarRecomendacion).not.toHaveBeenCalled();
    });

    it('si la IA falla igual devuelve el resumen con destinoSugerido null', async () => {
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4]));
      mlService.generarRecomendacion.mockRejectedValue(new Error('boom'));

      const resumen = await service.finalizarTurno(50);

      expect(resumen.destinoSugerido).toBeNull();
    });

    it('404 si el lote no existe en la empresa demo', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(service.finalizarTurno(50)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(demoRepository.reemplazarNombreSensor).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  describe('obtenerResumen', () => {
    beforeEach(() => {
      loteRepository.findById.mockResolvedValue(crearLote());
    });

    it('solo lee: no renombra, no clasifica ni genera recomendación', async () => {
      await service.obtenerResumen(50);

      expect(demoRepository.reemplazarNombreSensor).not.toHaveBeenCalled();
      expect(
        clasificacionLoteService.evaluarYClasificar,
      ).not.toHaveBeenCalled();
      expect(mlService.generarRecomendacion).not.toHaveBeenCalled();
    });

    it('mapea la clasificación, cuenta alertas y arma el destino sugerido', async () => {
      loteRepository.findById.mockResolvedValue(
        crearLote({ clasificacion: ClasificacionLote.NO_APTO }),
      );
      const serie = lecturas([4, 8]);
      demoRepository.findLecturasDeLotes.mockResolvedValue(serie);
      demoRepository.contarAlertasPorLote.mockResolvedValue(new Map([[50, 2]]));
      demoRepository.findRecomendacionPosteriorA.mockResolvedValue({
        destinoRecomendado: { nombre: 'manteca' },
        confianza: 0.8,
      });
      const eventos = [{ tipo: 'recepcion' }];
      loteTrazabilidadService.getTrazabilidad.mockResolvedValue({ eventos });

      const resumen = await service.obtenerResumen(50);

      expect(resumen).toEqual({
        loteId: 50,
        codigoLote: 'DEMO-1-1700000000000',
        estado: 'NO_APTO',
        desvios: 1,
        alertas: 2,
        destinoSugerido: { nombre: 'manteca', confianza: 0.8 },
        eventos,
      });
      // Solo cuenta una recomendación posterior a la primera lectura (la
      // del alta del lote usa la temperatura inicial).
      expect(demoRepository.findRecomendacionPosteriorA).toHaveBeenCalledWith(
        50,
        EMPRESA_ID,
        serie[0].timestampLectura,
      );
      expect(loteTrazabilidadService.getTrazabilidad).toHaveBeenCalledWith(
        50,
        TENANT,
      );
      expect(demoRepository.contarAlertasPorLote).toHaveBeenCalledWith(
        [50],
        EMPRESA_ID,
      );
    });

    it('estado null si el lote todavía no fue clasificado', async () => {
      loteRepository.findById.mockResolvedValue(
        crearLote({ clasificacion: null }),
      );

      const resumen = await service.obtenerResumen(50);

      expect(resumen.estado).toBeNull();
    });

    it('sin lecturas no busca recomendación', async () => {
      const resumen = await service.obtenerResumen(50);

      expect(demoRepository.findRecomendacionPosteriorA).not.toHaveBeenCalled();
      expect(resumen.destinoSugerido).toBeNull();
    });

    it.each([
      ['siempre dentro', [4, 5, 3, 4], 0],
      ['un desvío sostenido es un solo episodio', [4, 7, 7.5, 8, 7, 4], 1],
      ['dos desvíos separados', [4, 7, 4, 1, 1, 4], 2],
      ['arranca fuera', [9, 9, 4], 1],
      [
        'pasar de arriba a abajo sin volver al rango es el mismo episodio',
        [7, 1],
        1,
      ],
      ['el límite exacto está dentro', [2, 6, 4], 0],
    ])('desvíos por episodios: %s', async (_caso, valores, esperado) => {
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas(valores));

      const resumen = await service.obtenerResumen(50);

      expect(resumen.desvios).toBe(esperado);
    });

    it('desvíos 0 si no hay umbral configurado', async () => {
      demoRepository.findUmbrales.mockResolvedValue([]);
      demoRepository.findLecturasDeLotes.mockResolvedValue(lecturas([4, 99]));

      const resumen = await service.obtenerResumen(50);

      expect(resumen.desvios).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  describe('obtenerTablero', () => {
    const sensorJuan = crearSensor({ id: 1, nombre: 'Sensor 1 · Juan' });
    const sensorLibre = crearSensor({ id: 2, nombre: 'Sensor 2 · libre' });
    const sensorSinTurnos = crearSensor({ id: 3, nombre: 'Sensor 3 · libre' });
    const sensorNoDemo = crearSensor({ id: 9, nombre: 'TEMP-PLANTA' });

    beforeEach(() => {
      // Desordenados a propósito: el tablero ordena por N.
      sensorRepository.findAll.mockResolvedValue([
        sensorSinTurnos,
        sensorNoDemo,
        sensorLibre,
        sensorJuan,
      ]);
      historialRepository.findUltimosPorSensores.mockResolvedValue([
        { sensorId: 1, loteIdNuevo: 50 },
        { sensorId: 2, loteIdNuevo: 40 },
      ]);
      demoRepository.findLotes.mockResolvedValue([
        crearLote({
          id: 50,
          codigo: 'DEMO-1-1',
          clasificacion: ClasificacionLote.NO_APTO,
        }),
        crearLote({
          id: 40,
          codigo: 'DEMO-2-1',
          clasificacion: ClasificacionLote.APTO,
        }),
      ]);
      demoRepository.findLecturasDeLotes.mockResolvedValue([
        ...lecturas([4, 8, 7], 50),
        ...lecturas([4, 5], 40),
      ]);
      demoRepository.contarAlertasPorLote.mockResolvedValue(new Map([[50, 1]]));
    });

    it('arma una fila por sensor demo, ordenada por N, con turno, semáforo y métricas', async () => {
      const tablero = await service.obtenerTablero();

      expect(tablero.umbral).toEqual({ min: 2, max: 6 });
      expect(tablero.sensores.map((s) => s.id)).toEqual([1, 2, 3]);

      const [juan, libre, sinTurnos] = tablero.sensores;
      expect(juan).toEqual({
        id: 1,
        nombre: 'Sensor 1 · Juan',
        ocupado: true,
        lote: { id: 50, codigo: 'DEMO-1-1' },
        ultimaTemperatura: 7,
        ultimaLecturaEn: lecturas([4, 8, 7], 50)[2].timestampLectura,
        semaforo: 'FUERA_DE_RANGO',
        clasificacion: 'NO_APTO',
        desvios: 1,
        alertas: 1,
      });
      // Libre: muestra su último turno con ocupado = false.
      expect(libre).toMatchObject({
        ocupado: false,
        lote: { id: 40, codigo: 'DEMO-2-1' },
        ultimaTemperatura: 5,
        semaforo: 'EN_RANGO',
        clasificacion: 'APTO',
        desvios: 0,
        alertas: 0,
      });
      expect(sinTurnos).toEqual({
        id: 3,
        nombre: 'Sensor 3 · libre',
        ocupado: false,
        lote: null,
        ultimaTemperatura: null,
        ultimaLecturaEn: null,
        semaforo: null,
        clasificacion: null,
        desvios: 0,
        alertas: 0,
      });
    });

    it('hace un número fijo de consultas, en lote (sin N+1)', async () => {
      await service.obtenerTablero();

      expect(sensorRepository.findAll).toHaveBeenCalledTimes(1);
      expect(sensorRepository.findAll).toHaveBeenCalledWith(
        { parametro: Parametro.TEMPERATURA },
        EMPRESA_ID,
      );
      expect(historialRepository.findUltimosPorSensores).toHaveBeenCalledTimes(
        1,
      );
      expect(historialRepository.findUltimosPorSensores).toHaveBeenCalledWith(
        [1, 2, 3],
        EMPRESA_ID,
      );
      for (const metodo of [
        demoRepository.findLotes,
        demoRepository.findLecturasDeLotes,
        demoRepository.contarAlertasPorLote,
      ]) {
        expect(metodo).toHaveBeenCalledTimes(1);
        expect(metodo).toHaveBeenCalledWith([50, 40], EMPRESA_ID);
      }
      expect(demoRepository.findUmbrales).toHaveBeenCalledTimes(1);
      expect(sensorRepository.findOne).not.toHaveBeenCalled();
      expect(loteRepository.findById).not.toHaveBeenCalled();
    });

    it('no muestra lotes que no son de la demo', async () => {
      demoRepository.findLotes.mockResolvedValue([
        crearLote({ id: 50, codigo: 'LOTE-7-00001' }),
      ]);
      historialRepository.findUltimosPorSensores.mockResolvedValue([
        { sensorId: 1, loteIdNuevo: 50 },
      ]);

      const tablero = await service.obtenerTablero();

      expect(tablero.sensores[0]).toMatchObject({
        lote: null,
        ultimaTemperatura: null,
        alertas: 0,
      });
    });

    describe('cache de 1 s', () => {
      const AHORA = new Date('2026-10-15T12:00:00.000Z').getTime();

      beforeEach(() => {
        jest.useFakeTimers({ now: AHORA });
      });

      it('dentro del segundo devuelve la misma respuesta sin volver a consultar', async () => {
        const primera = await service.obtenerTablero();
        jest.setSystemTime(AHORA + 999);
        const segunda = await service.obtenerTablero();

        expect(segunda).toBe(primera);
        expect(sensorRepository.findAll).toHaveBeenCalledTimes(1);
        expect(demoRepository.findLecturasDeLotes).toHaveBeenCalledTimes(1);
      });

      it('pasado el segundo vuelve a consultar', async () => {
        await service.obtenerTablero();
        jest.setSystemTime(AHORA + 1_000);
        await service.obtenerTablero();

        expect(sensorRepository.findAll).toHaveBeenCalledTimes(2);
      });

      it('pedidos simultáneos comparten una sola corrida', async () => {
        const [a, b, c] = await Promise.all([
          service.obtenerTablero(),
          service.obtenerTablero(),
          service.obtenerTablero(),
        ]);

        expect(a).toBe(b);
        expect(b).toBe(c);
        expect(sensorRepository.findAll).toHaveBeenCalledTimes(1);
      });

      it('no cachea un error: el pedido siguiente reintenta', async () => {
        sensorRepository.findAll.mockRejectedValueOnce(new Error('db caída'));

        await expect(service.obtenerTablero()).rejects.toThrow('db caída');
        await expect(service.obtenerTablero()).resolves.toBeDefined();
        expect(sensorRepository.findAll).toHaveBeenCalledTimes(2);
      });
    });

    it('semáforo null y umbral null si no hay umbral configurado', async () => {
      demoRepository.findUmbrales.mockResolvedValue([]);

      const tablero = await service.obtenerTablero();

      expect(tablero.umbral).toBeNull();
      expect(tablero.sensores[0].semaforo).toBeNull();
    });
  });
});
