import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DashboardService } from '../dashboard.service';

import { Lote } from '../../lote/entities/lote.entity';
import { Notificacion } from '../../notificaciones/entities/notificacion.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,

        {
          provide: getRepositoryToken(Lote),
          useValue: loteRepo,
        },

        {
          provide: getRepositoryToken(Notificacion),
          useValue: notificacionRepo,
        },

        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: configParametroRepo,
        },

        {
          provide: getRepositoryToken(SensorLectura),
          useValue: sensorLecturaRepo,
        },

        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: medicionManualRepo,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('cuando existen datos del día, debe devolver todas las métricas del dashboard', async () => {
      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(15),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count
        .mockResolvedValueOnce(10) // lotes hoy
        .mockResolvedValueOnce(8)  // lotes ayer
        .mockResolvedValueOnce(10) // recepción
        .mockResolvedValueOnce(20) // aptos
        .mockResolvedValueOnce(2)  // no aptos
        .mockResolvedValueOnce(100); // total sistema

      notificacionRepo.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(2);

      configParametroRepo.find.mockResolvedValue([]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDashboard(tenant);

      expect(result).toBeDefined();

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

    it('cuando los valores del día son mayores que los del día anterior, la tendencia debe ser sube', async () => {
      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(50);

      notificacionRepo.count
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(2);

      configParametroRepo.find.mockResolvedValue([]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDashboard(tenant);

      expect(result.lotesProcesados.tendencia).toBe('sube');
      expect(result.alertasActivas.tendencia).toBe('sube');
    });

    it('cuando los valores del día son iguales a los del día anterior, la tendencia debe ser igual', async () => {
      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count
        .mockResolvedValue(5);

      notificacionRepo.count
        .mockResolvedValue(2);

      configParametroRepo.find.mockResolvedValue([]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDashboard(tenant);

      expect(result.lotesProcesados.tendencia).toBe('igual');
      expect(result.alertasActivas.tendencia).toBe('igual');
      expect(result.parametrosCriticos.tendencia).toBe('igual');
    });
  });

  describe('getHistoricoLotesProcesados', () => {
    it('cuando se solicita el histórico de 7 días, debe devolver un punto por cada día', async () => {

      const tenant = {
        empresaId: 1,
      } as any;

      loteRepo.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(9)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(11);

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        7,
      );

      expect(result.dias).toBe(7);

      expect(result.puntos).toHaveLength(7);

      expect(result.puntos[0].lotesProcesados).toBe(5);
      expect(result.puntos[1].lotesProcesados).toBe(6);
      expect(result.puntos[2].lotesProcesados).toBe(7);
      expect(result.puntos[3].lotesProcesados).toBe(8);
      expect(result.puntos[4].lotesProcesados).toBe(9);
      expect(result.puntos[5].lotesProcesados).toBe(10);
      expect(result.puntos[6].lotesProcesados).toBe(11);

      expect(loteRepo.count).toHaveBeenCalledTimes(7);
    });

    it('cuando no existen lotes procesados, debe devolver todos los días con valor cero', async () => {
    
      const tenant = {
        empresaId: 1,
      } as any;

      loteRepo.count.mockResolvedValue(0);


      const result = await service.getHistoricoLotesProcesados(
        tenant,
        7,
      );

      expect(result.dias).toBe(7);

      expect(result.puntos).toHaveLength(7);

      result.puntos.forEach((punto) => {
        expect(punto.lotesProcesados).toBe(0);
      });
    });
  

    it('cuando se solicita un único día, debe devolver solamente un registro histórico', async () => {

      const tenant = {
        empresaId: 1,
      }   as any;

      loteRepo.count.mockResolvedValue(12);

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        1,
      );

      expect(result.dias).toBe(1);

      expect(result.puntos).toHaveLength(1);
    
      expect(result.puntos[0].lotesProcesados).toBe(12);

      expect(loteRepo.count).toHaveBeenCalledTimes(1);
    });

    it('cuando se solicitan 30 días, debe consultar un día por cada registro solicitado', async () => {
    
      const tenant = {
        empresaId: 1,
      } as any;

      loteRepo.count.mockResolvedValue(3);

      const result = await service.getHistoricoLotesProcesados(
        tenant,
        30,
      );

      expect(result.dias).toBe(30);

      expect(result.puntos).toHaveLength(30);

      expect(loteRepo.count).toHaveBeenCalledTimes(30);
    });
  });

  describe('parámetros críticos', () => {
    it('cuando no existen configuraciones de parámetros, debe devolver cero parámetros críticos', async () => {

      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDashboard(tenant);

      expect(result.parametrosCriticos.valor).toBe(0);
    });

    it('cuando existen lecturas fuera de los umbrales configurados, debe contabilizar parámetros críticos', async () => {
    
      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([
        {
          id: 1,
          parametro: 'TEMPERATURA',
          tipoMateriaPrima: 'LECHE',
          umbralMin: 2,
          umbralMax: 8,
        },
      ]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            valor: '15',
            parametro: 'TEMPERATURA',
            materiaprima: 'LECHE',
          },
        ]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDashboard(tenant);

      expect(result.parametrosCriticos.valor).toBe(1);
    });

    it('cuando varias lecturas corresponden al mismo parámetro crítico, debe contarlo una sola vez', async () => {

      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([
        {
          id: 10,
          parametro: 'TEMPERATURA',
          tipoMateriaPrima: 'LECHE',
          umbralMin: 2,
          umbralMax: 8,
        },
      ]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            valor: '20',
            parametro: 'TEMPERATURA',
            materiaprima: 'LECHE',
          },
          {
            valor: '22',
            parametro: 'TEMPERATURA',
            materiaprima: 'LECHE',
          },
        ]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDashboard(tenant);

      expect(result.parametrosCriticos.valor).toBe(1);
    });

    it('cuando todas las lecturas están dentro del umbral configurado, no debe registrar parámetros críticos', async () => {

      const tenant = {
        empresaId: 1,
      } as any;

      const loteQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      loteRepo.createQueryBuilder.mockReturnValue(loteQB);

      loteRepo.count.mockResolvedValue(0);
      notificacionRepo.count.mockResolvedValue(0);

      configParametroRepo.find.mockResolvedValue([
        {
          id: 1,
          parametro: 'TEMPERATURA',
          tipoMateriaPrima: 'LECHE',
          umbralMin: 2,
          umbralMax: 8,
        },
      ]);

      sensorLecturaRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            valor: '5',
            parametro: 'TEMPERATURA',
            materiaprima: 'LECHE',
          },
        ]),
      });

      medicionManualRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            valor: '6',
            parametro: 'TEMPERATURA',
            tipomateriaprima: 'LECHE',
          },
        ]),
      });

      const result = await service.getDashboard(tenant);

      expect(result.parametrosCriticos.valor).toBe(0);
    });

    it('cuando los valores del día son menores que los del día anterior, la tendencia debe ser baja', async () => {
      const metrica = (service as any).buildMetrica(2, 8);

      expect(metrica.tendencia).toBe('baja');
      expect(metrica.variacion).toBe(-6);
    });
  });
});

