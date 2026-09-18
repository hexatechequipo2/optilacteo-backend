import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';

import { MlReentrenamientoCronService } from '../cron/ml-reentrenamiento-cron.service';
import { Empresa } from '../../empresa/entities/empresa.entity';

describe('MlReentrenamientoCronService — tarea programada de reentrenamiento ML (HU-49)', () => {
  let service: MlReentrenamientoCronService;

  const mockEmpresaRepo = {
    find: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv, ML_SERVICE_URL: 'http://localhost:8000' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlReentrenamientoCronService,
        {
          provide: getRepositoryToken(Empresa),
          useValue: mockEmpresaRepo,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<MlReentrenamientoCronService>(
      MlReentrenamientoCronService,
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('cuando una corrida previa está en ejecución, debe omitir el tick actual', async () => {
    // Arrange: forzamos el flag ejecutando a true
    (service as any).ejecutando = true;

    await service.reentrenarModelos();

    expect(mockEmpresaRepo.find).not.toHaveBeenCalled();
    expect(mockHttpService.post).not.toHaveBeenCalled();
  });

  it('debe iterar sobre las empresas activas y llamar al microservicio ML notificando aciertos', async () => {
    const empresasMock = [
      { id: 1, name: 'Lácteos A', isActive: true },
      { id: 2, name: 'Lácteos B', isActive: true },
    ] as Empresa[];

    mockEmpresaRepo.find.mockResolvedValue(empresasMock);

    const mockAxiosResponseSuccess: AxiosResponse = {
      data: { status: 'ok', accuracy: 0.92, n_samples: 150 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    mockHttpService.post.mockReturnValue(of(mockAxiosResponseSuccess));

    await service.reentrenarModelos();

    expect(mockEmpresaRepo.find).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    expect(mockHttpService.post).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/train/destino/1',
    );
    expect(mockHttpService.post).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/train/destino/2',
    );
    expect((service as any).ejecutando).toBe(false);
  });

  it('cuando el microservicio responde con un status distinto de ok, debe procesar la advertencia sin interrumpir el flujo', async () => {
    const empresasMock = [{ id: 1, name: 'Lácteos A', isActive: true }] as Empresa[];
    mockEmpresaRepo.find.mockResolvedValue(empresasMock);

    const mockAxiosResponseWarn: AxiosResponse = {
      data: { status: 'insufficient_data', detail: 'Datos insuficientes para entrenamiento' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    mockHttpService.post.mockReturnValue(of(mockAxiosResponseWarn));

    await service.reentrenarModelos();

    expect(mockHttpService.post).toHaveBeenCalledWith(
      'http://localhost:8000/train/destino/1',
    );
    expect((service as any).ejecutando).toBe(false);
  });

  it('cuando una llamada HTTP falla con error, debe capturar el error y continuar con las siguientes empresas', async () => {
    const empresasMock = [
      { id: 1, name: 'Lácteos Con Error', isActive: true },
      { id: 2, name: 'Lácteos OK', isActive: true },
    ] as Empresa[];

    mockEmpresaRepo.find.mockResolvedValue(empresasMock);

    const mockAxiosResponseSuccess: AxiosResponse = {
      data: { status: 'ok', accuracy: 0.88, n_samples: 100 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    mockHttpService.post
      .mockReturnValueOnce(throwError(() => new Error('Connection refused')))
      .mockReturnValueOnce(of(mockAxiosResponseSuccess));

    await service.reentrenarModelos();

    expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    expect(mockHttpService.post).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/train/destino/1',
    );
    expect(mockHttpService.post).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/train/destino/2',
    );
    expect((service as any).ejecutando).toBe(false);
  });
});