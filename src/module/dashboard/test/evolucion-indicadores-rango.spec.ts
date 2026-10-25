import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';

import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';
import { SemaforoService } from '../../config-parametro/semaforo.service';
import { AllExceptionsFilter } from '../../../common/filters/all-exceptions.filter';
import { Lote } from '../../lote/entities/lote.entity';
import { Notificacion } from '../../notificaciones/entities/notificacion.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';
import { PeriodoEvolucion } from '../dto/evolucion-indicadores-query.dto';
import { GranularidadAgregacion } from '../dto/evolucion-indicadores-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// HU-75: tests del rango personalizado sin base de datos. El query builder
// falso aplica sobre registros en memoria el mismo filtro y agrupación que
// la query real, usando los parámetros que le pasa el servicio.

const OFFSET_AR_MS = 3 * 60 * 60 * 1000;

interface Registro {
  instante: string; // ISO con offset explícito
  valor: number;
}

// Emula date_trunc('day', ts AT TIME ZONE 'America/Argentina/Cordoba'):
// devuelve un timestamp sin zona que el driver pg parsea como hora local.
const periodoDiaAR = (instante: Date): Date => {
  const civil = new Date(instante.getTime() - OFFSET_AR_MS);
  return new Date(
    civil.getUTCFullYear(),
    civil.getUTCMonth(),
    civil.getUTCDate(),
  );
};

const crearQueryBuilderFalso = (registros: Registro[]) => {
  const condiciones: string[] = [];
  let params: { desde?: Date; hastaExclusivo?: Date } = {};
  const qb: Record<string, jest.Mock> = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn((condicion: string, p: Record<string, unknown>) => {
      condiciones.push(condicion);
      params = { ...params, ...p };
      return qb;
    }),
    getRawMany: jest.fn(() => {
      const { desde, hastaExclusivo } = params;
      if (!desde || !hastaExclusivo) {
        throw new Error('La query no recibió desde/hastaExclusivo');
      }
      return Promise.resolve(
        registros
          .map((r) => ({ ...r, ts: new Date(r.instante) }))
          .filter((r) => r.ts >= desde && r.ts < hastaExclusivo)
          .map((r) => ({
            periodo: periodoDiaAR(r.ts),
            valor: String(r.valor),
          })),
      );
    }),
  };
  return { qb, condiciones, getParams: () => params };
};

describe('Evolución de indicadores — rango personalizado (HU-75)', () => {
  const sensorLecturaRepo = { createQueryBuilder: jest.fn() };
  const medicionManualRepo = { createQueryBuilder: jest.fn() };

  const crearModulo = (): Promise<TestingModule> =>
    Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Lote), useValue: {} },
        { provide: getRepositoryToken(Notificacion), useValue: {} },
        { provide: getRepositoryToken(ConfiguracionParametro), useValue: {} },
        {
          provide: getRepositoryToken(SensorLectura),
          useValue: sensorLecturaRepo,
        },
        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: medicionManualRepo,
        },
        { provide: SemaforoService, useValue: {} },
      ],
    }).compile();

  const prepararDatos = (sensor: Registro[], manual: Registro[] = []) => {
    const qbSensor = crearQueryBuilderFalso(sensor);
    const qbManual = crearQueryBuilderFalso(manual);
    sensorLecturaRepo.createQueryBuilder.mockReturnValue(qbSensor.qb);
    medicionManualRepo.createQueryBuilder.mockReturnValue(qbManual.qb);
    return { qbSensor, qbManual };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DashboardService.getEvolucionIndicadores', () => {
    let service: DashboardService;
    const tenant = { empresaId: 1, rolNombre: null };

    beforeEach(async () => {
      service = (await crearModulo()).get(DashboardService);
    });

    const consultar = (desde: string, hasta: string) =>
      service.getEvolucionIndicadores(tenant, {
        periodo: PeriodoEvolucion.RANGO,
        indicadores: [Parametro.TEMPERATURA],
        desde,
        hasta,
      });

    const valorDe = (
      resultado: Awaited<ReturnType<typeof consultar>>,
      fecha: string,
    ) => resultado.series[0].puntos.find((p) => p.fecha === fecha)?.valor;

    it('filtra con un intervalo semiabierto en UTC, sin BETWEEN', async () => {
      const { qbSensor, qbManual } = prepararDatos([]);

      await consultar('2026-03-10', '2026-03-15');

      for (const { condiciones, getParams } of [qbSensor, qbManual]) {
        const filtro = condiciones.find((c) => c.includes(':hastaExclusivo'));
        expect(filtro).toMatch(/>= :desde AND .* < :hastaExclusivo/);
        expect(condiciones.join(' ')).not.toMatch(/BETWEEN/i);
        expect(getParams().desde?.toISOString()).toBe(
          '2026-03-10T03:00:00.000Z',
        );
        expect(getParams().hastaExclusivo?.toISOString()).toBe(
          '2026-03-16T03:00:00.000Z',
        );
      }
    });

    it('rango del 10 al 15: incluye el 10 y el 15 y excluye el 9 y el 16', async () => {
      prepararDatos([
        { instante: '2026-03-09T12:00:00-03:00', valor: 900 },
        { instante: '2026-03-09T23:59:59-03:00', valor: 900 },
        { instante: '2026-03-10T12:00:00-03:00', valor: 10 },
        { instante: '2026-03-15T12:00:00-03:00', valor: 15 },
        { instante: '2026-03-16T00:00:00-03:00', valor: 900 },
        { instante: '2026-03-16T12:00:00-03:00', valor: 900 },
      ]);

      const resultado = await consultar('2026-03-10', '2026-03-15');

      expect(resultado.series[0].puntos.map((p) => p.fecha)).toEqual([
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
        '2026-03-14',
        '2026-03-15',
      ]);
      expect(valorDe(resultado, '2026-03-10')).toBe(10);
      expect(valorDe(resultado, '2026-03-15')).toBe(15);
      expect(resultado.desde).toBe('2026-03-10T03:00:00.000Z');
      expect(resultado.hasta).toBe('2026-03-16T02:59:59.999Z');
    });

    it('incluye un registro a las 23:30 hora AR del día 15', async () => {
      prepararDatos([{ instante: '2026-03-16T02:30:00Z', valor: 7.5 }]);

      const resultado = await consultar('2026-03-10', '2026-03-15');

      expect(valorDe(resultado, '2026-03-15')).toBe(7.5);
    });

    it('incluye un registro a las 00:30 hora AR del día 10 (03:30 UTC)', async () => {
      prepararDatos([{ instante: '2026-03-10T03:30:00Z', valor: 6.6 }]);

      const resultado = await consultar('2026-03-10', '2026-03-15');

      expect(valorDe(resultado, '2026-03-10')).toBe(6.6);
    });

    it('promedia sensor y manual del mismo día AR', async () => {
      prepararDatos(
        [{ instante: '2026-03-10T00:30:00-03:00', valor: 10 }],
        [{ instante: '2026-03-10T23:30:00-03:00', valor: 20 }],
      );

      const resultado = await consultar('2026-03-10', '2026-03-10');

      expect(resultado.series[0].puntos).toEqual([
        { fecha: '2026-03-10', valor: 15 },
      ]);
    });

    it('rango que cruza un cambio de mes', async () => {
      prepararDatos([
        { instante: '2026-02-26T23:59:59-03:00', valor: 900 },
        { instante: '2026-02-27T00:00:00-03:00', valor: 1 },
        { instante: '2026-02-28T23:30:00-03:00', valor: 2 },
        { instante: '2026-03-01T00:30:00-03:00', valor: 3 },
        { instante: '2026-03-02T23:59:59-03:00', valor: 4 },
        { instante: '2026-03-03T00:00:00-03:00', valor: 900 },
      ]);

      const resultado = await consultar('2026-02-27', '2026-03-02');

      expect(resultado.granularidadAplicada).toBe(GranularidadAgregacion.DIA);
      expect(resultado.series[0].puntos).toEqual([
        { fecha: '2026-02-27', valor: 1 },
        { fecha: '2026-02-28', valor: 2 },
        { fecha: '2026-03-01', valor: 3 },
        { fecha: '2026-03-02', valor: 4 },
      ]);
    });
  });

  describe('GET /dashboard/indicadores/evolucion', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
      app = (await crearModulo()).createNestApplication();
      // Mismo pipe y filtro que main.ts; el tenant lo inyectaría el JWT.
      app.use((req: Request, _res: Response, next: NextFunction) => {
        (req as any).user = { empresaId: 1 };
        next();
      });
      app.useGlobalFilters(new AllExceptionsFilter());
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    const get = (query: Record<string, string>) =>
      request(app.getHttpServer())
        .get('/dashboard/indicadores/evolucion')
        .query({
          periodo: 'rango',
          indicadores: Parametro.TEMPERATURA,
          ...query,
        });

    it('Desde > Hasta: responde 400 con un mensaje claro', async () => {
      prepararDatos([]);

      const res = await get({ desde: '2026-03-15', hasta: '2026-03-10' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        'La fecha "desde" no puede ser posterior a la fecha "hasta"',
      );
      expect(sensorLecturaRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it.each([
      [
        'fecha inexistente',
        { desde: '2026-02-30', hasta: '2026-03-10' },
        'desde',
      ],
      [
        'formato DD/MM/YYYY',
        { desde: '2026-03-01', hasta: '10/03/2026' },
        'hasta',
      ],
      [
        'ISO con hora',
        { desde: '2026-03-10T00:00:00Z', hasta: '2026-03-15' },
        'desde',
      ],
    ])('%s: responde 400', async (_caso, query, campo) => {
      const res = await get(query);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        `${campo} debe ser una fecha válida con formato YYYY-MM-DD`,
      );
    });

    it('rango sin hasta: responde 400', async () => {
      const res = await get({ desde: '2026-03-10' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        'hasta es requerido cuando periodo=rango',
      );
    });

    it('período sin registros: responde 200 con los períodos en null', async () => {
      prepararDatos([], []);

      const res = await get({ desde: '2026-03-10', hasta: '2026-03-12' });

      expect(res.status).toBe(200);
      expect(res.body.series).toEqual([
        {
          parametro: Parametro.TEMPERATURA,
          puntos: [
            { fecha: '2026-03-10', valor: null },
            { fecha: '2026-03-11', valor: null },
            { fecha: '2026-03-12', valor: null },
          ],
        },
      ]);
    });

    it('Desde = Hasta: responde 200 con un único día', async () => {
      prepararDatos([{ instante: '2026-03-10T23:30:00-03:00', valor: 5 }]);

      const res = await get({ desde: '2026-03-10', hasta: '2026-03-10' });

      expect(res.status).toBe(200);
      expect(res.body.series[0].puntos).toEqual([
        { fecha: '2026-03-10', valor: 5 },
      ]);
    });
  });
});
