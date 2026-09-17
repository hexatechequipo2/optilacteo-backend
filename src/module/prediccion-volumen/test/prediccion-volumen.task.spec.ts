import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrediccionVolumenTask } from '../tasks/prediccion-volumen.task';
import { PrediccionVolumenService } from '../prediccion-volumen.service';
import { PrediccionVolumenRepository } from '../repository/prediccion-volumen.repository';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

describe('PrediccionVolumenTask', () => {
  let task: PrediccionVolumenTask;
  let serviceMock: { generarYPersistir: jest.Mock };
  let repoMock: { findEmpresasConDatos: jest.Mock };

  beforeEach(async () => {
    // Silenciar los logs de NestJS durante la ejecución de las pruebas
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    serviceMock = {
      generarYPersistir: jest.fn(),
    };

    repoMock = {
      findEmpresasConDatos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionVolumenTask,
        {
          provide: PrediccionVolumenService,
          useValue: serviceMock,
        },
        {
          provide: PrediccionVolumenRepository,
          useValue: repoMock,
        },
      ],
    }).compile();

    task = module.get<PrediccionVolumenTask>(PrediccionVolumenTask);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(task).toBeDefined();
  });

  describe('ejecutar', () => {
    it('debe iterar sobre todas las materias primas soportadas y ejecutar generarYPersistir por cada empresa', async () => {
      repoMock.findEmpresasConDatos.mockImplementation((tipo: TipoMateriaPrima) => {
        if (tipo === TipoMateriaPrima.LECHE_CRUDA) return Promise.resolve([1, 2]);
        if (tipo === TipoMateriaPrima.CREMA_DE_LECHE) return Promise.resolve([1]);
        return Promise.resolve([]);
      });

      serviceMock.generarYPersistir.mockResolvedValue(undefined);

      await task.ejecutar();

      expect(repoMock.findEmpresasConDatos).toHaveBeenCalledTimes(3);
      expect(repoMock.findEmpresasConDatos).toHaveBeenCalledWith(TipoMateriaPrima.LECHE_CRUDA);
      expect(repoMock.findEmpresasConDatos).toHaveBeenCalledWith(TipoMateriaPrima.CREMA_DE_LECHE);
      expect(repoMock.findEmpresasConDatos).toHaveBeenCalledWith(TipoMateriaPrima.MASA_HILADA);

      // Se debe haber llamado 3 veces en total (2 para Leche Cruda, 1 para Crema de Leche)
      expect(serviceMock.generarYPersistir).toHaveBeenCalledTimes(3);
      expect(serviceMock.generarYPersistir).toHaveBeenCalledWith(1, TipoMateriaPrima.LECHE_CRUDA);
      expect(serviceMock.generarYPersistir).toHaveBeenCalledWith(2, TipoMateriaPrima.LECHE_CRUDA);
      expect(serviceMock.generarYPersistir).toHaveBeenCalledWith(1, TipoMateriaPrima.CREMA_DE_LECHE);
    });

    it('debe capturar y loguear el error si una empresa falla, continuando con la ejecución de las demás', async () => {
      repoMock.findEmpresasConDatos.mockResolvedValue([1, 2]);

      // Simulamos que la empresa 1 falla pero la empresa 2 no
      serviceMock.generarYPersistir.mockImplementation((empresaId: number) => {
        if (empresaId === 1) return Promise.reject(new Error('Error de conexión con la BD'));
        return Promise.resolve(undefined);
      });

      await expect(task.ejecutar()).resolves.not.toThrow();

      // Verificar que continuó y procesó las siguientes empresas / materias primas
      expect(serviceMock.generarYPersistir).toHaveBeenCalledWith(1, TipoMateriaPrima.LECHE_CRUDA);
      expect(serviceMock.generarYPersistir).toHaveBeenCalledWith(2, TipoMateriaPrima.LECHE_CRUDA);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});