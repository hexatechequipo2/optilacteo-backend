import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AnomaliaService } from '../anomalia.service';
import { ANOMALIA_CLIENT } from '../interfaces/anomalia-client.interface';
import { NOTIFICACION_REPOSITORY } from '../../notificaciones/repository/notificacion.repository.interface';
import { NotificacionesGateway } from '../../notificaciones/gateway/notificaciones.gateway';
import { Lote } from '../../lote/entities/lote.entity';
import { User } from '../../user/entities/user.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoDesvioAnomalia } from '../../notificaciones/enums/tipo-desvio-anomalia.enum';
import { TipoNotificacion } from '../../notificaciones/enums/tipo-notificacion.enum';
import { ROLES } from '../../rol/constants/roles.constants';

describe('AnomaliaService — evaluación de anomalías (HU-50)', () => {
  let service: AnomaliaService;

  const mockAnomaliaClient = {
    detectar: jest.fn(),
  };

  const mockNotificacionRepository = {
    findAlertaAbiertaAnomalia: jest.fn(),
    create: jest.fn(),
  };

  const mockLoteRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    find: jest.fn(),
  };

  const mockGateway = {
    emitirNotificacion: jest.fn(),
  };

  const mockParams = {
    empresaId: 1,
    loteId: 10,
    loteCodigo: 'LOTE-2026-001',
    parametro: Parametro.PH,
    valor: 4.5,
    historicoReciente: [6.5, 6.4, 6.3],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomaliaService,
        { provide: ANOMALIA_CLIENT, useValue: mockAnomaliaClient },
        { provide: NOTIFICACION_REPOSITORY, useValue: mockNotificacionRepository },
        { provide: getRepositoryToken(Lote), useValue: mockLoteRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: NotificacionesGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<AnomaliaService>(AnomaliaService);
  });

  afterEach(() => jest.clearAllMocks());

  it('cuando la consulta al microservicio de ML falla por error de red/sistema, debe capturar la excepción y finalizar sin romper la ejecución', async () => {
    mockAnomaliaClient.detectar.mockRejectedValue(new Error('HTTP Service Unavailable'));

    await service.evaluarAnomalia(mockParams);

    expect(mockAnomaliaClient.detectar).toHaveBeenCalledWith({
      empresaId: mockParams.empresaId,
      parametro: mockParams.parametro,
      valor: mockParams.valor,
      historicoReciente: mockParams.historicoReciente,
    });
    expect(mockNotificacionRepository.findAlertaAbiertaAnomalia).not.toHaveBeenCalled();
    expect(mockGateway.emitirNotificacion).not.toHaveBeenCalled();
  });

  it('cuando el microservicio responde con status distinto de "ok", debe interrumpir la evaluación sin generar notificaciones', async () => {
    mockAnomaliaClient.detectar.mockResolvedValue({
      status: 'error',
      esAnomalia: false,
    });

    await service.evaluarAnomalia(mockParams);

    expect(mockNotificacionRepository.findAlertaAbiertaAnomalia).not.toHaveBeenCalled();
    expect(mockGateway.emitirNotificacion).not.toHaveBeenCalled();
  });

  it('cuando el análisis del modelo determina que NO hay anomalía, debe ignorar el procesamiento de alertas', async () => {
    mockAnomaliaClient.detectar.mockResolvedValue({
      status: 'ok',
      esAnomalia: false,
    });

    await service.evaluarAnomalia(mockParams);

    expect(mockNotificacionRepository.findAlertaAbiertaAnomalia).not.toHaveBeenCalled();
    expect(mockGateway.emitirNotificacion).not.toHaveBeenCalled();
  });

  it('cuando se detecta una anomalía pero ya existe una alerta abierta idéntica, debe ignorarla y evitar duplicar la notificación', async () => {
    const tipoDesvioSimulado = Object.values(TipoDesvioAnomalia)[0] as TipoDesvioAnomalia;

    mockAnomaliaClient.detectar.mockResolvedValue({
      status: 'ok',
      esAnomalia: true,
      tipoDesvio: tipoDesvioSimulado,
      confianza: 95.5,
      modeloVersion: 'v1.2.0',
    });

    mockNotificacionRepository.findAlertaAbiertaAnomalia.mockResolvedValue({
      id: 99,
      loteId: mockParams.loteId,
    });

    await service.evaluarAnomalia(mockParams);

    expect(mockNotificacionRepository.findAlertaAbiertaAnomalia).toHaveBeenCalledWith(
      mockParams.empresaId,
      mockParams.loteId,
      mockParams.parametro,
      tipoDesvioSimulado,
    );
    expect(mockLoteRepo.findOne).not.toHaveBeenCalled();
    expect(mockGateway.emitirNotificacion).not.toHaveBeenCalled();
  });

  it('cuando se detecta una anomalía válida sin duplicados, debe persistir y emitir la notificación por socket a cada responsable de producción', async () => {
    const resultadoML = {
      status: 'ok',
      esAnomalia: true,
      tipoDesvio: Object.values(TipoDesvioAnomalia)[0] as TipoDesvioAnomalia,
      confianza: 98.2,
      modeloVersion: 'v2.0.0',
    };

    const loteMock = { id: mockParams.loteId, empresaId: mockParams.empresaId };
    const responsablesMock = [
      { id: 101, email: 'resp1@lacteo.com' },
      { id: 102, email: 'resp2@lacteo.com' },
    ];

    mockAnomaliaClient.detectar.mockResolvedValue(resultadoML);
    mockNotificacionRepository.findAlertaAbiertaAnomalia.mockResolvedValue(null);
    mockLoteRepo.findOne.mockResolvedValue(loteMock);
    mockUserRepo.find.mockResolvedValue(responsablesMock);

    mockNotificacionRepository.create.mockImplementation((entity) =>
      Promise.resolve({ id: Math.floor(Math.random() * 1000), ...entity }),
    );

    await service.evaluarAnomalia(mockParams);

    expect(mockLoteRepo.findOne).toHaveBeenCalledWith({
      where: { id: mockParams.loteId, empresaId: mockParams.empresaId },
    });

    expect(mockUserRepo.find).toHaveBeenCalledWith({
      where: {
        empresa: { id: mockParams.empresaId },
        rol: { nombre: ROLES.RESPONSABLE_PRODUCCION },
        isActive: true,
      },
      relations: { rol: true, empresa: true },
    });

    expect(mockNotificacionRepository.create).toHaveBeenCalledTimes(2);
    expect(mockGateway.emitirNotificacion).toHaveBeenCalledTimes(2);

    expect(mockGateway.emitirNotificacion).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tipo: TipoNotificacion.ALERTA_ANOMALIA,
        confianza: 98.2,
        tipoDesvio: resultadoML.tipoDesvio,
      }),
      mockParams.empresaId,
      101,
    );

    expect(mockGateway.emitirNotificacion).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tipo: TipoNotificacion.ALERTA_ANOMALIA,
        confianza: 98.2,
        tipoDesvio: resultadoML.tipoDesvio,
      }),
      mockParams.empresaId,
      102, 
    );
  });
});