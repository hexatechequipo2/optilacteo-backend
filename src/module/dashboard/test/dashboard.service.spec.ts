import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DashboardService } from '../dashboard.service';
import { GranularidadHistorico } from '../dto/dashboard-historico.dto';

import { Lote } from '../../lote/entities/lote.entity';
import { Notificacion } from '../../notificaciones/entities/notificacion.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';
import { EstadoLote } from '../../lote/enums/estado-lote.enum';

describe('DashboardService', () => {
  let service: DashboardService;

  const loteRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const notificacionRepo = {
    count: jest.fn(),
  };

  const configParametroRepo = {
    find: jest.fn(),
  };

  const sensorLecturaRepo = {
    createQueryBuilder: jest.fn(),
  };

  const medicionManualRepo = {
    createQueryBuilder: jest.fn(),
  };

  const buildSensorLecturaQBVacio = () => ({
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  const buildMedicionManualQBVacio = () => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  const buildLoteClasificacionQB = (getCount: number) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(getCount),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Lote), useValue: loteRepo },
        { provide: getRepositoryToken(Notificacion), useValue: notificacionRepo },
        { provide: getRepositoryToken(ConfiguracionParametro), useValue: configParametroRepo },
        { provide: getRepositoryToken(SensorLectura), useValue: sensorLecturaRepo },
        { provide: getRepositoryToken(MedicionManualLote), useValue: medicionManualRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('getDashboard', () => {
    it('cuando existen datos del período, debe devolver todas las métricas con granularidad "dia"', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(15));

      loteRepo.count
        .mockResolvedValueOnce(10) // lotesProcesados actual
        .mockResolvedValueOnce(8) // lotesProcesados anterior
        .mockResolvedValueOnce(10) // lineaCalidad.recepcion
        .mockResolvedValueOnce(20) // lineaCalidad.aptos
        .mockResolvedValueOnce(2) // lineaCalidad.noAptos
        .mockResolvedValueOnce(100); // lineaCalidad.totalLotesSistema

      notificacionRepo.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
      configParametroRepo.find.mockResolvedValue([]);
      sensorLecturaRepo.createQueryBuilder.mockReturnValue(buildSensorLecturaQBVacio());
      medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.granularidad).toBe(GranularidadHistorico.DIA);
      expect(result.lotesProcesados.valor).toBe(10);
      expect(result.lotesProcesados.valorAnterior).toBe(8);
      expect(result.alertasActivas.valor).toBe(4);
      expect(result.alertasActivas.valorAnterior).toBe(2);
      expect(result.parametrosCriticos.valor).toBe(0);
      expect(result.lineaCalidad.recepcion).toBe(10);
      expect(result.lineaCalidad.clasificacion).toBe(15);
      expect(result.lineaCalidad.aptos).toBe(20);
      expect(result.lineaCalidad.noAptos).toBe(2);
      expect(result.lineaCalidad.totalLotesSistema).toBe(100);
      expect(result.actualizadoEn).toBeInstanceOf(Date);
    });

    it.each([GranularidadHistorico.DIA, GranularidadHistorico.SEMANA, GranularidadHistorico.MES])(
      'debe devolver la granularidad "%s" tal cual fue solicitada',
      async (granularidad) => {
        const tenant = { empresaId: 1 } as any;

        loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(0));
        loteRepo.count.mockResolvedValue(0);
        notificacionRepo.count.mockResolvedValue(0);
        configParametroRepo.find.mockResolvedValue([]);
        sensorLecturaRepo.createQueryBuilder.mockReturnValue(buildSensorLecturaQBVacio());
        medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

        const result = await service.getDashboard(tenant, granularidad);

        expect(result.granularidad).toBe(granularidad);
      },
    );

    it('cuando los valores del período actual son mayores que los del anterior, la tendencia debe ser sube', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(5));

      loteRepo.count
        .mockResolvedValueOnce(12) // actual
        .mockResolvedValueOnce(5) // anterior
        .mockResolvedValueOnce(8) // recepcion
        .mockResolvedValueOnce(6) // aptos
        .mockResolvedValueOnce(1) // noAptos
        .mockResolvedValueOnce(50); // totalLotesSistema

      notificacionRepo.count.mockResolvedValueOnce(6).mockResolvedValueOnce(2);
      configParametroRepo.find.mockResolvedValue([]);
      sensorLecturaRepo.createQueryBuilder.mockReturnValue(buildSensorLecturaQBVacio());
      medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.lotesProcesados.tendencia).toBe('sube');
      expect(result.alertasActivas.tendencia).toBe('sube');
    });

    it('cuando los valores del período actual son iguales a los del anterior, la tendencia debe ser igual', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(3));
      loteRepo.count.mockResolvedValue(5);
      notificacionRepo.count.mockResolvedValue(2);
      configParametroRepo.find.mockResolvedValue([]);
      sensorLecturaRepo.createQueryBuilder.mockReturnValue(buildSensorLecturaQBVacio());
      medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.lotesProcesados.tendencia).toBe('igual');
      expect(result.alertasActivas.tendencia).toBe('igual');
      expect(result.parametrosCriticos.tendencia).toBe('igual');
    });
  });

  describe('getHistoricoLotesProcesados', () => {
    // Fecha de sistema fija para que los períodos generados sean deterministas
    const HOY_FIJO = new Date('2026-08-03T12:00:00Z'); // lunes

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(HOY_FIJO);
    });

    const buildHistoricoQB = (raw: Array<{ periodo: Date; cantidad: string }>) => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(raw),
    });

    it('cuando se solicitan 3 días, debe rellenar con 0 los días sin lotes procesados', async () => {
      const tenant = { empresaId: 1 } as any;

      const qb = buildHistoricoQB([
        { periodo: new Date('2026-08-01T00:00:00Z'), cantidad: '5' },
        { periodo: new Date('2026-08-03T00:00:00Z'), cantidad: '9' },
        // 2026-08-02 sin datos: debe completarse con 0
      ]);
      loteRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        GranularidadHistorico.DIA,
        3,
      );

      expect(result.granularidad).toBe(GranularidadHistorico.DIA);
      expect(result.cantidad).toBe(3);
      expect(result.puntos).toEqual([
        { fecha: '2026-08-01', lotesProcesados: 5 },
        { fecha: '2026-08-02', lotesProcesados: 0 },
        { fecha: '2026-08-03', lotesProcesados: 9 },
      ]);
    });

    it('cuando no existen lotes procesados en ningún período, debe devolver todos los puntos en cero', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildHistoricoQB([]));

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        GranularidadHistorico.DIA,
        7,
      );

      expect(result.puntos).toHaveLength(7);
      result.puntos.forEach((punto) => {
        expect(punto.lotesProcesados).toBe(0);
      });
    });

    it('cuando cantidad es 0, debe devolver un arreglo de puntos vacío', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildHistoricoQB([]));

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        GranularidadHistorico.DIA,
        0,
      );

      expect(result.puntos).toEqual([]);
    });

    it('con granularidad "mes", debe devolver las fechas en formato YYYY-MM', async () => {
      const tenant = { empresaId: 1 } as any;

      const qb = buildHistoricoQB([
        { periodo: new Date('2026-07-01T00:00:00Z'), cantidad: '20' },
        { periodo: new Date('2026-08-01T00:00:00Z'), cantidad: '15' },
      ]);
      loteRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        GranularidadHistorico.MES,
        2,
      );

      expect(result.puntos).toEqual([
        { fecha: '2026-07', lotesProcesados: 20 },
        { fecha: '2026-08', lotesProcesados: 15 },
      ]);
    });

    // Test de regresión: PostgreSQL no reconoce 'dia'/'semana'/'mes' como unidad
    // de date_trunc (bug real detectado: "unit \"dia\" not recognized"). Este test
    // asegura que la query siempre use la unidad en inglés, sin importar el
    // valor del enum recibido.
    it.each([
      [GranularidadHistorico.DIA, 'day'],
      [GranularidadHistorico.SEMANA, 'week'],
      [GranularidadHistorico.MES, 'month'],
    ])(
      'con granularidad "%s", debe traducir la unidad de date_trunc a "%s" (no al valor en español)',
      async (granularidad, unidadEsperada) => {
        const tenant = { empresaId: 1 } as any;
        const qb = buildHistoricoQB([]);
        loteRepo.createQueryBuilder.mockReturnValue(qb);

        await service.getHistoricoLotesProcesados(tenant, granularidad, 1);

        const [selectExpr] = qb.select.mock.calls[0];
        expect(selectExpr).toContain(`date_trunc('${unidadEsperada}'`);
        expect(selectExpr).not.toContain(`date_trunc('${granularidad}'`);
      },
    );

    it('debe filtrar por empresaId y por los estados FINALIZADO/RECHAZADO', async () => {
      const tenant = { empresaId: 42 } as any;
      const qb = buildHistoricoQB([]);
      loteRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getHistoricoLotesProcesados(tenant, GranularidadHistorico.DIA, 1);

      expect(qb.where).toHaveBeenCalledWith('lote.empresaId = :empresaId', { empresaId: 42 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'lote.estado IN (:...estados)',
        expect.objectContaining({
          estados: expect.arrayContaining([EstadoLote.FINALIZADO, EstadoLote.RECHAZADO]),
        }),
      );
    });
  });

  describe('mapearUnidadPostgres (helper privado)', () => {
    it('debe mapear cada valor del enum a su unidad correspondiente en inglés', () => {
      const mapear = (g: GranularidadHistorico) =>
        (service as any).mapearUnidadPostgres(g);

      expect(mapear(GranularidadHistorico.DIA)).toBe('day');
      expect(mapear(GranularidadHistorico.SEMANA)).toBe('week');
      expect(mapear(GranularidadHistorico.MES)).toBe('month');
    });
  });

  describe('parámetros críticos', () => {
    it('cuando no existen configuraciones de parámetros, debe devolver cero parámetros críticos', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(0));
      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);
      configParametroRepo.find.mockResolvedValue([]);
      sensorLecturaRepo.createQueryBuilder.mockReturnValue(buildSensorLecturaQBVacio());
      medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.parametrosCriticos.valor).toBe(0);
    });

    it('cuando existen lecturas fuera de los umbrales configurados, debe contabilizar parámetros críticos', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(0));
      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([
        { id: 1, parametro: 'TEMPERATURA', tipoMateriaPrima: 'LECHE', umbralMin: 2, umbralMax: 8 },
      ]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ valor: '15', parametro: 'TEMPERATURA', materiaprima: 'LECHE' }]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.parametrosCriticos.valor).toBe(1);
    });

    it('cuando varias lecturas corresponden al mismo parámetro crítico, debe contarlo una sola vez', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(0));
      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([
        { id: 10, parametro: 'TEMPERATURA', tipoMateriaPrima: 'LECHE', umbralMin: 2, umbralMax: 8 },
      ]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { valor: '20', parametro: 'TEMPERATURA', materiaprima: 'LECHE' },
          { valor: '22', parametro: 'TEMPERATURA', materiaprima: 'LECHE' },
        ]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue(buildMedicionManualQBVacio());

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.parametrosCriticos.valor).toBe(1);
    });

    it('cuando todas las lecturas están dentro del umbral configurado, no debe registrar parámetros críticos', async () => {
      const tenant = { empresaId: 1 } as any;

      loteRepo.createQueryBuilder.mockReturnValue(buildLoteClasificacionQB(0));
      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([
        { id: 1, parametro: 'TEMPERATURA', tipoMateriaPrima: 'LECHE', umbralMin: 2, umbralMax: 8 },
      ]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ valor: '5', parametro: 'TEMPERATURA', materiaprima: 'LECHE' }]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ valor: '6', parametro: 'TEMPERATURA', tipomateriaprima: 'LECHE' }]),
      });

      const result = await service.getDashboard(tenant, GranularidadHistorico.DIA);

      expect(result.parametrosCriticos.valor).toBe(0);
    });
  });

  describe('buildMetrica (helper privado)', () => {
    it('cuando el valor actual es menor que el anterior, la tendencia debe ser baja', () => {
      const metrica = (service as any).buildMetrica(2, 8);

      expect(metrica.tendencia).toBe('baja');
      expect(metrica.variacion).toBe(-6);
    });
  });
});