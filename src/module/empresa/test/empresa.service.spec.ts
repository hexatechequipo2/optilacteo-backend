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
import { DETALLE_POR_PLAN } from '../config/plan-detalles.config';

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
    describe('findAll', () => {
    it('calcula el skip y pasa los filtros al repositorio', async () => {
      mockEmpresaRepository.findAllPaginated.mockResolvedValue([
        [{ id: 1, modulos: [] }, { id: 2, modulos: [] }],
        2,
      ]);

      const res = await service.findAll({ page: 2, limit: 5, isActive: true } as any);

      expect(mockEmpresaRepository.findAllPaginated).toHaveBeenCalledWith(5, 5, { isActive: true });
      expect(res).toBeDefined();
    });
  });

  describe('findOne / findMine (casos faltantes)', () => {
    it('findOne lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(100, tenantAdmin)).rejects.toThrow(NotFoundException);
    });

    it('findMine delega en findOne con el empresaId del tenant', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, modulos: [] });

      await service.findMine(tenantGerente);

      expect(mockEmpresaRepository.findById).toHaveBeenCalledWith(100);
    });
  });

  describe('update (casos faltantes)', () => {
    const actual = { id: 100, cuit: '30-A', plan: Plan.STARTER, modulos: [] };

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(service.update(100, { name: 'X' } as any, tenantAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ConflictException si el nuevo CUIT ya lo usa otra empresa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(actual);
      mockEmpresaRepository.findByCuit.mockResolvedValue({ id: 2 });

      await expect(service.update(100, { cuit: '30-B' } as any, tenantAdmin)).rejects.toThrow(
        ConflictException,
      );
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('no valida el CUIT si no cambió', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(actual);

      await service.update(100, { cuit: '30-A' } as any, tenantAdmin);

      expect(mockEmpresaRepository.findByCuit).not.toHaveBeenCalled();
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, { cuit: '30-A' });
    });

    it('actualiza todos los campos y no sincroniza módulos si el plan no cambió', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(actual);
      mockEmpresaRepository.findByCuit.mockResolvedValue(null);
      const dto = {
        name: 'Nuevo',
        cuit: '30-B',
        email: 'a@b.com',
        telefono: '123',
        direccion: 'Calle 1',
        plan: Plan.STARTER,
      } as any;

      await service.update(100, dto, tenantAdmin);

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, dto);
      expect(mockEmpresaRepository.syncModulos).not.toHaveBeenCalled();
    });
  });

  describe('updateIdentidad', () => {
    it('lanza NotFoundException si el tenant no tiene empresa', async () => {
      await expect(service.updateIdentidad({ name: 'X' } as any, tenantAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(service.updateIdentidad({ name: 'X' } as any, tenantGerente)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('actualiza solo el nombre', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, modulos: [] });
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, name: 'Nuevo', modulos: [] });

      await service.updateIdentidad({ name: 'Nuevo' } as any, tenantGerente);

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, { name: 'Nuevo' });
    });
  });

  describe('uploadLogo (casos faltantes)', () => {
    const file = { originalname: 'logo.png', buffer: Buffer.from('x'), mimetype: 'image/png' } as any;

    it('lanza NotFoundException si el tenant no tiene empresa', async () => {
      await expect(service.uploadLogo(file, tenantAdmin)).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(service.uploadLogo(file, tenantGerente)).rejects.toThrow(NotFoundException);
    });

    it('sube el logo sin borrar nada si no había uno previo', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, logoPath: null, modulos: [] });
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, modulos: [] });

      await service.uploadLogo(file, tenantGerente);

      expect(mockStorageService.delete).not.toHaveBeenCalled();
      expect(mockStorageService.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^logos\/empresa-100-\d+\.png$/),
        file.buffer,
        'image/png',
      );
    });

    it('ignora el error al borrar el logo anterior y sube igual el nuevo', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, logoPath: 'logos/viejo.png', modulos: [] });
      mockStorageService.delete.mockRejectedValue(new Error('R2 caído'));
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, modulos: [] });

      await expect(service.uploadLogo(file, tenantGerente)).resolves.toBeDefined();
      expect(mockStorageService.upload).toHaveBeenCalled();
    });
  });

  describe('deleteLogo', () => {
    it('lanza NotFoundException si el tenant no tiene empresa', async () => {
      await expect(service.deleteLogo(tenantAdmin)).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(service.deleteLogo(tenantGerente)).rejects.toThrow(NotFoundException);
    });

    it('borra el archivo y limpia logoPath', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, logoPath: 'logos/a.png', modulos: [] });
      mockStorageService.delete.mockResolvedValue(undefined);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, modulos: [] });

      await service.deleteLogo(tenantGerente);

      expect(mockStorageService.delete).toHaveBeenCalledWith('logos/a.png');
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, { logoPath: null });
    });

    it('no llama al storage si no había logo, y tolera que el borrado falle', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, logoPath: null, modulos: [] });
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, modulos: [] });
      await service.deleteLogo(tenantGerente);
      expect(mockStorageService.delete).not.toHaveBeenCalled();

      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, logoPath: 'logos/a.png', modulos: [] });
      mockStorageService.delete.mockRejectedValue(new Error('fallo'));
      await expect(service.deleteLogo(tenantGerente)).resolves.toBeDefined();
    });
  });

  describe('activate / remove', () => {
    it('activate marca la empresa como activa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, modulos: [] });
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, isActive: true, modulos: [] });

      await service.activate(100, tenantAdmin);

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, { isActive: true });
    });

    it('remove delega en deactivate', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, modulos: [] });
      mockEmpresaRepository.hasActiveUsers.mockResolvedValue(false);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ id: 100, isActive: false, modulos: [] });

      await service.remove(100, tenantAdmin);

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, { isActive: false });
    });
  });

  describe('módulos (casos faltantes)', () => {
    it('desactivarModulo desactiva sin exigir que el módulo esté en el plan', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, plan: Plan.STARTER });
      mockEmpresaRepository.findModulo.mockResolvedValue({ id: 9 });
      mockEmpresaRepository.updateModulo.mockResolvedValue({
        modulo: ModuloSistema.ASISTENTE_VOZ,
        isActive: false,
      });

      const res = await service.desactivarModulo(
        100,
        { modulo: ModuloSistema.ASISTENTE_VOZ },
        tenantAdmin,
      );

      expect(mockEmpresaRepository.updateModulo).toHaveBeenCalledWith(9, false);
      expect(res).toEqual({ modulo: ModuloSistema.ASISTENTE_VOZ, isActive: false });
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(
        service.activarModulo(100, { modulo: ModuloSistema.DASHBOARD }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el módulo no está asignado a la empresa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, plan: Plan.ENTERPRISE });
      mockEmpresaRepository.findModulo.mockResolvedValue(null);

      await expect(
        service.activarModulo(100, { modulo: ModuloSistema.ASISTENTE_VOZ }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLimiteUsuarios', () => {
    it('devuelve el máximo de usuarios del plan', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({ id: 100, plan: Plan.PRO });

      await expect(service.getLimiteUsuarios(100)).resolves.toBe(DETALLE_POR_PLAN[Plan.PRO].maxUsuarios);
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(null);

      await expect(service.getLimiteUsuarios(100)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResumenPlanes', () => {
    it('devuelve los 3 planes con la cantidad de empresas asignadas', async () => {
      mockEmpresaRepository.findAll.mockResolvedValue([
        { plan: Plan.STARTER },
        { plan: Plan.STARTER },
        { plan: Plan.PRO },
      ]);

      const res = await service.getResumenPlanes();

      expect(res.map((p) => p.nombre)).toEqual(['Starter', 'Pro', 'Enterprise']);
      expect(res.map((p) => p.empresasAsignadas)).toEqual([2, 1, 0]);
      expect(res[0].modulos[0]).toEqual({ nombre: expect.any(String), codigo: expect.any(String) });
    });
  });
  
  describe('validaciones de tenant', () => {
    it('update debe rechazar el acceso a una empresa ajena', async () => {
      await expect(
        service.update(999, { name: 'Otra empresa' } as any, tenantGerente),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('deactivate debe rechazar una empresa ajena', async () => {
      await expect(
        service.deactivate(999, tenantGerente),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });

    it('activate debe rechazar una empresa ajena', async () => {
      await expect(
        service.activate(999, tenantGerente),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });

    it('activarModulo debe rechazar una empresa ajena', async () => {
      await expect(
        service.activarModulo(
          999,
          { modulo: ModuloSistema.DASHBOARD },
          tenantGerente,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });

    it('desactivarModulo debe rechazar una empresa ajena', async () => {
      await expect(
        service.desactivarModulo(
          999,
          { modulo: ModuloSistema.DASHBOARD },
          tenantGerente,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('create (casos adicionales)', () => {
    it('debe inicializar los módulos correspondientes al plan de la empresa', async () => {
      const creada = {
        id: 200,
        name: 'Empresa Pro',
        cuit: '30-98765432-1',
        plan: Plan.PRO,
        isActive: true,
      };

      mockEmpresaRepository.findByCuit.mockResolvedValue(null);
      mockEmpresaRepository.createEmpresa.mockResolvedValue(creada);
      mockEmpresaRepository.findById.mockResolvedValue({
        ...creada,
        modulos: [],
      });
      mockEmpresaRepository.createModulos.mockResolvedValue(undefined);
      mockPermisoService.otorgarPermisosPorDefecto.mockResolvedValue(undefined);

      await service.create({
        name: creada.name,
        cuit: creada.cuit,
        plan: Plan.PRO,
      } as any);

      expect(mockEmpresaRepository.createModulos).toHaveBeenCalledWith(
        DETALLE_POR_PLAN[Plan.PRO].modulos.map((modulo) => ({
          modulo,
          isActive: true,
          empresa: creada,
        })),
      );
      expect(
        mockPermisoService.otorgarPermisosPorDefecto,
      ).toHaveBeenCalledWith(200);
    });
  });

  describe('update (casos adicionales)', () => {
    it('debe actualizar solamente los campos enviados', async () => {
      const actual = {
        id: 100,
        name: 'Empresa original',
        cuit: '30-12345678-9',
        plan: Plan.STARTER,
        modulos: [],
      };

      mockEmpresaRepository.findById.mockResolvedValue(actual);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({
        ...actual,
        name: 'Nombre actualizado',
      });

      await service.update(
        100,
        { name: 'Nombre actualizado' } as any,
        tenantAdmin,
      );

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, {
        name: 'Nombre actualizado',
      });
      expect(mockEmpresaRepository.findByCuit).not.toHaveBeenCalled();
      expect(mockEmpresaRepository.syncModulos).not.toHaveBeenCalled();
    });

    it('debe propagar errores al consultar el CUIT', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        cuit: '30-11111111-1',
        plan: Plan.STARTER,
      });
      mockEmpresaRepository.findByCuit.mockRejectedValue(
        new Error('Error de base de datos'),
      );

      await expect(
        service.update(
          100,
          { cuit: '30-22222222-2' } as any,
          tenantAdmin,
        ),
      ).rejects.toThrow('Error de base de datos');

      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });
  });

  describe('updateIdentidad (casos adicionales)', () => {
    it('debe propagar errores al actualizar el nombre', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        name: 'Empresa original',
      });
      mockEmpresaRepository.updateEmpresa.mockRejectedValue(
        new Error('No se pudo actualizar'),
      );

      await expect(
        service.updateIdentidad(
          { name: 'Nuevo nombre' } as any,
          tenantGerente,
        ),
      ).rejects.toThrow('No se pudo actualizar');

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, {
        name: 'Nuevo nombre',
      });
    });
  });

  describe('deleteLogo (casos adicionales)', () => {
    it('debe propagar errores al actualizar logoPath', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        logoPath: null,
        modulos: [],
      });
      mockEmpresaRepository.updateEmpresa.mockRejectedValue(
        new Error('No se pudo actualizar el logo'),
      );

      await expect(
        service.deleteLogo(tenantGerente),
      ).rejects.toThrow('No se pudo actualizar el logo');

      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(100, {
        logoPath: null,
      });
    });
  });

  describe('toggleModulo (casos adicionales)', () => {
    it('debe lanzar NotFoundException al desactivar un módulo no asignado', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        plan: Plan.STARTER,
      });
      mockEmpresaRepository.findModulo.mockResolvedValue(null);

      await expect(
        service.desactivarModulo(
          100,
          { modulo: ModuloSistema.ASISTENTE_VOZ },
          tenantAdmin,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaRepository.updateModulo).not.toHaveBeenCalled();
    });

    it('debe propagar errores al actualizar el estado del módulo', async () => {
      mockEmpresaRepository.findById.mockResolvedValue({
        id: 100,
        plan: Plan.ENTERPRISE,
      });
      mockEmpresaRepository.findModulo.mockResolvedValue({
        id: 5,
        modulo: ModuloSistema.ASISTENTE_VOZ,
      });
      mockEmpresaRepository.updateModulo.mockRejectedValue(
        new Error('No se pudo actualizar el módulo'),
      );

      await expect(
        service.activarModulo(
          100,
          { modulo: ModuloSistema.ASISTENTE_VOZ },
          tenantAdmin,
        ),
      ).rejects.toThrow('No se pudo actualizar el módulo');
    });
  });

  describe('getResumenPlanes (casos adicionales)', () => {
    it('debe devolver cero empresas asignadas cuando el repositorio está vacío', async () => {
      mockEmpresaRepository.findAll.mockResolvedValue([]);

      const resultado = await service.getResumenPlanes();

      expect(resultado).toHaveLength(3);
      expect(resultado.map((plan) => plan.empresasAsignadas)).toEqual([
        0, 0, 0,
      ]);
    });
  });
});