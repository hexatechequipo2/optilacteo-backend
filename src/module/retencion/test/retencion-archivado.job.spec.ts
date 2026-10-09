import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { RetencionArchivadoJob } from '../retencion-archivado.job';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { RetencionArchivadoService } from '../retencion-archivado.service';

describe('RetencionArchivadoJob', () => {
  let job: RetencionArchivadoJob;
  let archivadoService: RetencionArchivadoService;

  const mockEmpresaRepo = {
    find: jest.fn(),
  };

  const mockRetencionArchivadoService = {
    archivarVencidos: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetencionArchivadoJob,
        {
          provide: getRepositoryToken(Empresa),
          useValue: mockEmpresaRepo,
        },
        {
          provide: RetencionArchivadoService,
          useValue: mockRetencionArchivadoService,
        },
      ],
    }).compile();

    job = module.get<RetencionArchivadoJob>(RetencionArchivadoJob);
    archivadoService = module.get<RetencionArchivadoService>(
      RetencionArchivadoService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(job).toBeDefined();
  });

  describe('archivarTodasLasEmpresas', () => {
    it('debe ejecutar archivarVencidos para cada una de las empresas obtenidas', async () => {
      const empresasMock = [
        { id: 1, nombre: 'Empresa A' },
        { id: 2, nombre: 'Empresa B' },
      ];

      mockEmpresaRepo.find.mockResolvedValue(empresasMock);
      mockRetencionArchivadoService.archivarVencidos.mockResolvedValue(
        undefined,
      );

      await job.archivarTodasLasEmpresas();

      expect(mockEmpresaRepo.find).toHaveBeenCalledTimes(1);
      expect(archivadoService.archivarVencidos).toHaveBeenCalledTimes(2);
      expect(archivadoService.archivarVencidos).toHaveBeenNthCalledWith(1, 1);
      expect(archivadoService.archivarVencidos).toHaveBeenNthCalledWith(2, 2);
    });

    it('no debe detener la ejecución global si archivarVencidos falla para una empresa en particular', async () => {
      const empresasMock = [
        { id: 1, nombre: 'Empresa con Error' },
        { id: 2, nombre: 'Empresa Exitosa' },
      ];

      mockEmpresaRepo.find.mockResolvedValue(empresasMock);

      // Simular fallo en la primera empresa y éxito en la segunda
      mockRetencionArchivadoService.archivarVencidos
        .mockRejectedValueOnce(new Error('Error de conexión con la BD'))
        .mockResolvedValueOnce(undefined);

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await job.archivarTodasLasEmpresas();

      expect(archivadoService.archivarVencidos).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Fallo el job de retención para empresa 1: Error de conexión con la BD',
        ),
      );
    });

    it('debe finalizar sin problemas si no existen empresas registradas', async () => {
      mockEmpresaRepo.find.mockResolvedValue([]);

      await job.archivarTodasLasEmpresas();

      expect(mockEmpresaRepo.find).toHaveBeenCalledTimes(1);
      expect(archivadoService.archivarVencidos).not.toHaveBeenCalled();
    });
  });
});