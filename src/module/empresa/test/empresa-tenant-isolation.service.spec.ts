import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaService } from '../empresa.service';
import { EMPRESA_REPOSITORY } from '../repository/empresa-repository.interface';
import { Plan } from '../enums/plan.enum';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const empresaA = {
  id: 1,
  name: 'Lacteos Norte',
  plan: Plan.PRO,
  isActive: true,
  users: [],
  modulos: [],
};

const empresaB = {
  id: 2,
  name: 'Lacteos Sur',
  plan: Plan.STARTER,
  isActive: true,
  users: [],
  modulos: [],
};

const tenantEmpresaA: TenantContext = { empresaId: 1, isAdmin: false };
const tenantEmpresaB: TenantContext = { empresaId: 2, isAdmin: false };
const tenantAdmin: TenantContext = { empresaId: null, isAdmin: true };

describe('EmpresaService - aislamiento multi-tenant', () => {
  let service: EmpresaService;
  let mockEmpresaRepository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    createEmpresa: jest.Mock;
    updateEmpresa: jest.Mock;
    deleteEmpresa: jest.Mock;
    hasActiveUsers: jest.Mock;
    createModulos: jest.Mock;
    findModulo: jest.Mock;
    updateModulo: jest.Mock;
  };

  beforeEach(async () => {
    mockEmpresaRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      createEmpresa: jest.fn(),
      updateEmpresa: jest.fn(),
      deleteEmpresa: jest.fn(),
      hasActiveUsers: jest.fn(),
      createModulos: jest.fn(),
      findModulo: jest.fn(),
      updateModulo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaService,
        { provide: EMPRESA_REPOSITORY, useValue: mockEmpresaRepository },
      ],
    }).compile();

    service = module.get<EmpresaService>(EmpresaService);
  });

  describe('findOne', () => {
    it('un usuario de la Empresa A puede ver su propia empresa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(empresaA);

      const result = await service.findOne(1, tenantEmpresaA);

      expect(result.id).toBe(1);
      expect(mockEmpresaRepository.findById).toHaveBeenCalledWith(1);
    });

    it('un usuario de la Empresa A NO puede ver la Empresa B por id (403)', async () => {
      await expect(service.findOne(2, tenantEmpresaA)).rejects.toThrow(ForbiddenException);
      // El chequeo corta antes de tocar el repositorio.
      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });

    it('admin puede ver cualquier empresa por id', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(empresaB);

      const result = await service.findOne(2, tenantAdmin);

      expect(result.id).toBe(2);
    });
  });

  describe('update', () => {
    it('un usuario de la Empresa A NO puede actualizar la Empresa B (403)', async () => {
      await expect(
        service.update(2, { name: 'Hackeada' }, tenantEmpresaA),
      ).rejects.toThrow(ForbiddenException);
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('admin puede actualizar cualquier empresa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(empresaB);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ ...empresaB, name: 'Nuevo nombre' });

      const result = await service.update(2, { name: 'Nuevo nombre' }, tenantAdmin);

      expect(result.name).toBe('Nuevo nombre');
    });
  });

  describe('activate / deactivate / remove', () => {
    it('un usuario de la Empresa A NO puede desactivar la Empresa B (403)', async () => {
      await expect(service.deactivate(2, tenantEmpresaA)).rejects.toThrow(ForbiddenException);
      expect(mockEmpresaRepository.hasActiveUsers).not.toHaveBeenCalled();
    });

    it('un usuario de la Empresa A NO puede activar la Empresa B (403)', async () => {
      await expect(service.activate(2, tenantEmpresaA)).rejects.toThrow(ForbiddenException);
    });

    it('remove() hereda la proteccion de deactivate() (403 para empresa ajena)', async () => {
      await expect(service.remove(2, tenantEmpresaA)).rejects.toThrow(ForbiddenException);
    });

    it('un usuario de la Empresa A SI puede desactivar su propia empresa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(empresaA);
      mockEmpresaRepository.hasActiveUsers.mockResolvedValue(false);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({ ...empresaA, isActive: false });

      const result = await service.deactivate(1, tenantEmpresaA);

      expect(result.isActive).toBe(false);
    });
  });

  describe('activarModulo / desactivarModulo', () => {
    it('un usuario de la Empresa A NO puede tocar modulos de la Empresa B (403)', async () => {
      await expect(
        service.activarModulo(2, { modulo: 'dashboard' } as never, tenantEmpresaA),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.desactivarModulo(2, { modulo: 'dashboard' } as never, tenantEmpresaA),
      ).rejects.toThrow(ForbiddenException);

      expect(mockEmpresaRepository.findModulo).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('un usuario no-admin obtiene los datos de su propia empresa', async () => {
      mockEmpresaRepository.findById.mockResolvedValue(empresaA);

      const result = await service.findMine(tenantEmpresaA);

      expect(result.id).toBe(1);
    });

    it('admin recibe un mensaje claro (no generico) en vez de un 404 confuso', async () => {
      await expect(service.findMine(tenantAdmin)).rejects.toThrow(NotFoundException);
      await expect(service.findMine(tenantAdmin)).rejects.toThrow(
        'Los usuarios admin no tienen una empresa asociada',
      );
      expect(mockEmpresaRepository.findById).not.toHaveBeenCalled();
    });
  });
});
