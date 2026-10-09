import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EmpresaService } from '../empresa.service';
import { EMPRESA_REPOSITORY } from '../repository/empresa-repository.interface';
import { StorageService } from '../../../common/storage/storage.service';
import { PermisoService } from '../../permiso/permiso.service';
import { Plan } from '../enums/plan.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

describe('EmpresaService', () => {
  let service: EmpresaService;

  const mockEmpresaRepository = {
    findByCuit: jest.fn(),
    createEmpresa: jest.fn(),
    createModulos: jest.fn(),
    findById: jest.fn(),
    findAllPaginated: jest.fn(),
    findAll: jest.fn(),
    updateEmpresa: jest.fn(),
    syncModulos: jest.fn(),
    hasActiveUsers: jest.fn(),
    findModulo: jest.fn(),
    updateModulo: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
    delete: jest.fn(),
    getPublicUrl: jest.fn((path) => `https://storage.test/${path}`),
  };

  const mockPermisoService = {
    otorgarPermisosPorDefecto: jest.fn(),
  };

  const tenantAdmin: TenantContext = {
    empresaId: null,
    rolNombre: ROLES.ADMINISTRADOR,
  } as any;

  const tenantGerente: TenantContext = {
    empresaId: 100,
    rolNombre: 'GERENTE',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaService,
        {
          provide: EMPRESA_REPOSITORY,
          useValue: mockEmpresaRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: PermisoService,
          useValue: mockPermisoService,
        },
      ],
    }).compile();

    service = module.get<EmpresaService>(EmpresaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Lácteos Test',
      cuit: '30-12345678-9',
      email: 'info@lacteostest.com',
      plan: Plan.STARTER,
    } as any;

    it('debe lanzar ConflictException si el CUIT ya está registrado', async () => {
      mockEmpresaRepository.findByCuit.mockResolvedValue({ id: 1 });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockEmpresaRepository.createEmpresa).not.toHaveBeenCalled();
    });

    it('debe crear la empresa, inicializar módulos del plan y otorgar permisos por defecto', async () => {
      // Arrange
      const createdEntity = { id: 100, ...createDto, isActive: true };
      mockEmpresaRepository.findByCuit.mockResolvedValue(null);
      mockEmpresaRepository.createEmpresa.mockResolvedValue(createdEntity);
      mockEmpresaRepository.findById.mockResolvedValue({
        ...createdEntity,
        modulos: [],
      });

      // Act
      const resultado = await service.create(createDto);

      // Assert
      expect(mockEmpresaRepository.createEmpresa).toHaveBeenCalled();
      expect(mockEmpresaRepository.createModulos).toHaveBeenCalled();
      expect(
        mockPermisoService.otorgarPermisosPorDefecto,
      ).toHaveBeenCalledWith(100);
      expect(resultado).toBeDefined();
    });
  });

  describe('findOne / findMine', () => {
    it('debe lanzar NotFoundException en findMine si el tenant no tiene empresaId (Admin Global)', async () => {
      await expect(service.findMine(tenantAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe permitir consultar la propia empresa a un usuario Gerente', async () => {
      const empresaMock = { id: 100, name: 'Empresa Propia', modulos: [] };
      mockEmpresaRepository.findById.mockResolvedValue(empresaMock);

      const resultado = await service.findOne(100, tenantGerente);

      expect(resultado).toBeDefined();
      expect(mockEmpresaRepository.findById).toHaveBeenCalledWith(100);
    });

    it('debe lanzar NotFoundException si un usuario intenta acceder a una empresa que no es la suya', async () => {
      await expect(service.findOne(999, tenantGerente)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debe re-sincronizar los módulos si se actualiza el plan de la empresa', async () => {
      // Arrange
      const empresaActual = { id: 100, plan: Plan.STARTER, cuit: '30111111119' };
      const updateDto = { plan: Plan.PRO };

      mockEmpresaRepository.findById.mockResolvedValue(empresaActual);

      // Act
      await service.update(100, updateDto, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ plan: Plan.PRO }),
      );
      expect(mockEmpresaRepository.syncModulos).toHaveBeenCalledWith(
        100,
        expect.any(Array),
      );
    });
  });

  describe('uploadLogo / deleteLogo', () => {
    const fileMock = {
      originalname: 'logo.png',
      buffer: Buffer.from('test'),
      mimetype: 'image/png',
    } as any;

    it('debe subir el nuevo logo y eliminar el anterior si existía', async () => {
      // Arrange
      const empresaConLogo = {
        id: 100,
        logoPath: 'logos/empresa-100-old.png',
        modulos: [],
      };
      mockEmpresaRepository.findById.mockResolvedValue(empresaConLogo);
      mockStorageService.upload.mockResolvedValue(undefined);
      mockStorageService.delete.mockResolvedValue(undefined);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({
        ...empresaConLogo,
        logoPath: 'logos/empresa-100-new.png',
      });

      // Act
      await service.uploadLogo(fileMock, tenantGerente);

      // Assert
      expect(mockStorageService.delete).toHaveBeenCalledWith(
        'logos/empresa-100-old.png',
      );
      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          logoPath: expect.stringContaining('logos/empresa-100-'),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('debe lanzar ConflictException si la empresa posee usuarios activos', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100 });
      mockEmpresaRepository.hasActiveUsers.mockResolvedValue(true);

      // Act & Assert
      await expect(service.deactivate(100, tenantAdmin)).rejects.toThrow(
        ConflictException,
      );
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('debe desactivar la empresa si no posee usuarios activos', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100 });
      mockEmpresaRepository.hasActiveUsers.mockResolvedValue(false);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({
        id: 100,
        isActive: false,
        modulos: [],
      });

      // Act
      await service.deactivate(100, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, {
        isActive: false,
      });
    });
  });

  describe('activarModulo / desactivarModulo', () => {
    it('debe lanzar BadRequestException si el módulo no pertenece al plan contratado', async () => {
      // Arrange: Plan STARTER no incluye ASISTENTE_VOZ
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        plan: Plan.STARTER,
      });

      // Act & Assert
      await expect(
        service.activarModulo(
          100,
          { modulo: ModuloSistema.ASISTENTE_VOZ },
          tenantAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe activar el módulo si está dentro del plan permitido', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        plan: Plan.ENTERPRISE,
      });
      mockEmpresaRepository.findModulo.mockResolvedValue({
        id: 5,
        modulo: ModuloSistema.ASISTENTE_VOZ,
        isActive: false,
      });
      mockEmpresaRepository.updateModulo.mockResolvedValue({
        modulo: ModuloSistema.ASISTENTE_VOZ,
        isActive: true,
      });

      // Act
      const resultado = await service.activarModulo(
        100,
        { modulo: ModuloSistema.ASISTENTE_VOZ },
        tenantAdmin,
      );

      // Assert
      expect(mockEmpresaRepository.updateModulo).toHaveBeenCalledWith(5, true);
      expect(resultado).toEqual({
        modulo: ModuloSistema.ASISTENTE_VOZ,
        isActive: true,
      });
    });
  });
});