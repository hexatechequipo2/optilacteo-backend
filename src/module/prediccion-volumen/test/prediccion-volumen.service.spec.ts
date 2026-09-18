import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrediccionVolumenService } from '../prediccion-volumen.service';
import { PREDICCION_CLIENT } from '../interfaces/prediccion-client.interface';
import { PREDICCION_VOLUMEN_REPOSITORY } from '../repository/prediccion-volumen.repository.interface';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { StatusPrediccion } from '../enums/status-prediccion.enum';
import { UnidadCantidad } from '../../lote/enums/unidad-cantidad.enum';

describe('PrediccionVolumenService', () => {
  let service: PrediccionVolumenService;
  let clientMock: { predecir: jest.Mock };
  let repoMock: {
    obtenerSerieHistorica: jest.Mock;
    findUltimaVigente: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    // Silenciar logs de NestJS durante las pruebas
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    clientMock = {
      predecir: jest.fn(),
    };

    repoMock = {
      obtenerSerieHistorica: jest.fn(),
      findUltimaVigente: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionVolumenService,
        {
          provide: PREDICCION_CLIENT,
          useValue: clientMock,
        },
        {
          provide: PREDICCION_VOLUMEN_REPOSITORY,
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<PrediccionVolumenService>(PrediccionVolumenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generarYPersistir', () => {
    it('debe guardar status INSUFFICIENT_DATA si la serie histórica tiene menos de 21 días', async () => {
      repoMock.obtenerSerieHistorica.mockResolvedValue(new Array(10).fill({ fecha: '2026-09-01', valor: 100 }));

      await service.generarYPersistir(1, TipoMateriaPrima.LECHE_CRUDA);

      expect(repoMock.create).toHaveBeenCalledWith({
        empresaId: 1,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        unidad: UnidadCantidad.LITROS,
        modeloVersion: 'n/a',
        dias: [],
        status: StatusPrediccion.INSUFFICIENT_DATA,
      });
      expect(clientMock.predecir).not.toHaveBeenCalled();
    });

    it('debe capturar el error si la llamada al cliente falla y finalizar sin lanzar excepción', async () => {
      repoMock.obtenerSerieHistorica.mockResolvedValue(new Array(25).fill({ fecha: '2026-09-01', valor: 100 }));
      clientMock.predecir.mockRejectedValue(new Error('ML client offline'));

      await expect(service.generarYPersistir(1, TipoMateriaPrima.LECHE_CRUDA)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
      expect(repoMock.create).not.toHaveBeenCalled();
    });

    it('debe guardar status INSUFFICIENT_DATA si el cliente ML no responde status ok', async () => {
      repoMock.obtenerSerieHistorica.mockResolvedValue(new Array(25).fill({ fecha: '2026-09-01', valor: 100 }));
      clientMock.predecir.mockResolvedValue({
        status: 'insufficient_data',
        modeloVersion: 'v1.0.0',
      });

      await service.generarYPersistir(1, TipoMateriaPrima.LECHE_CRUDA);

      expect(repoMock.create).toHaveBeenCalledWith({
        empresaId: 1,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        unidad: UnidadCantidad.LITROS,
        modeloVersion: 'v1.0.0',
        dias: [],
        status: StatusPrediccion.INSUFFICIENT_DATA,
      });
    });

    it('debe guardar la predicción con status OK cuando la respuesta es exitosa', async () => {
      repoMock.obtenerSerieHistorica.mockResolvedValue(new Array(25).fill({ fecha: '2026-09-01', valor: 100 }));
      const mockDias = [{ fecha: '2026-09-17', esperado: 120, minimo: 100, maximo: 140 }];
      clientMock.predecir.mockResolvedValue({
        status: 'ok',
        modeloVersion: 'v1.2.0',
        dias: mockDias,
      });

      await service.generarYPersistir(1, TipoMateriaPrima.MASA_HILADA);

      expect(repoMock.create).toHaveBeenCalledWith({
        empresaId: 1,
        tipoMateriaPrima: TipoMateriaPrima.MASA_HILADA,
        unidad: UnidadCantidad.KILOGRAMOS,
        modeloVersion: 'v1.2.0',
        dias: mockDias,
        status: StatusPrediccion.OK,
      });
    });
  });

  describe('obtenerParaDashboard', () => {
    it('debe retornar respuesta de datos insuficientes cuando no existe predicción previa', async () => {
      repoMock.findUltimaVigente.mockResolvedValue(null);
      repoMock.obtenerSerieHistorica.mockResolvedValue([{ fecha: '2026-09-10', valor: 50 }]);

      const result = await service.obtenerParaDashboard(1, {
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      } as any);

      expect(result.status).toBe(StatusPrediccion.INSUFFICIENT_DATA);
      expect(result.prediccion).toEqual([]);
      expect(result.historicoReciente).toHaveLength(1);
    });

    it('debe retornar respuesta de datos insuficientes si la última predicción guardada tiene ese estado', async () => {
      repoMock.findUltimaVigente.mockResolvedValue({
        status: StatusPrediccion.INSUFFICIENT_DATA,
        unidad: UnidadCantidad.LITROS,
        fechaGeneracion: new Date(),
      });
      repoMock.obtenerSerieHistorica.mockResolvedValue([]);

      const result = await service.obtenerParaDashboard(1, {
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      } as any);

      expect(result.status).toBe(StatusPrediccion.INSUFFICIENT_DATA);
      expect(result.unidad).toBe(UnidadCantidad.LITROS);
    });

    it('debe retornar status OK y la estructura completa si hay predicción vigente exitosa', async () => {
      const mockFechaGeneracion = new Date();
      repoMock.findUltimaVigente.mockResolvedValue({
        status: StatusPrediccion.OK,
        unidad: UnidadCantidad.LITROS,
        fechaGeneracion: mockFechaGeneracion,
        modeloVersion: 'v1.0.0',
        dias: [{ fecha: '2026-09-17', esperado: 200, minimo: 180, maximo: 220 }],
      });
      repoMock.obtenerSerieHistorica.mockResolvedValue([{ fecha: '2026-09-15', valor: 190 }]);

      const result = await service.obtenerParaDashboard(1, {
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        diasHistorico: 7,
      } as any);

      expect(result.status).toBe(StatusPrediccion.OK);
      expect(result.modeloVersion).toBe('v1.0.0');
      expect(result.prediccion).toHaveLength(1);
      expect(result.historicoReciente).toEqual([{ fecha: '2026-09-15', valor: 190 }]);
    });
  });

  describe('exportarCsv', () => {
    it('debe generar un Buffer de CSV con el BOM UTF-8 y las filas correspondientes', async () => {
      repoMock.findUltimaVigente.mockResolvedValue({
        status: StatusPrediccion.OK,
        unidad: UnidadCantidad.LITROS,
        fechaGeneracion: new Date(),
        modeloVersion: 'v1.0.0',
        dias: [{ fecha: '2026-09-17', esperado: 200, minimo: 180, maximo: 220 }],
      });
      repoMock.obtenerSerieHistorica.mockResolvedValue([{ fecha: '2026-09-15', valor: 190 }]);

      const buffer = await service.exportarCsv(1, {
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      } as any);

      const contenido = buffer.toString('utf8');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(contenido).toContain('\uFEFF'); // BOM de UTF-8
      expect(contenido).toContain('"Tipo";"Fecha";"Valor";"Mínimo";"Esperado";"Máximo"');
      expect(contenido).toContain('"Histórico";"2026-09-15";"190";"";"";""');
      expect(contenido).toContain('"Predicción";"2026-09-17";"";"180";"200";"220"');
    });
  });
});