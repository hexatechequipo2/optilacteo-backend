import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermisoService } from '../permiso.service';
import { PERMISO_REPOSITORY } from '../repository/permiso-interface.repository';
import { PermisoModulo } from '../entities/permiso-modulo.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

function buildPermiso(overrides: Partial<PermisoModulo> = {}): PermisoModulo {
  return {
    id: 1,
    modulo: ModuloSistema.DASHBOARD,
    canRead: true,
    canWrite: false,
    rol: { id: 5, nombre: 'Gerente' } as PermisoModulo['rol'],
    ...overrides,
  } as PermisoModulo;
}

describe('PermisoService', () => {
  let service: PermisoService;
  let mockPermisoRepository: {
    findByRol: jest.Mock;
    findByUsuario: jest.Mock;
    findById: jest.Mock;
    updatePermiso: jest.Mock;
  };

  beforeEach(async () => {
    mockPermisoRepository = {
      findByRol: jest.fn(),
      findByUsuario: jest.fn(),
      findById: jest.fn(),
      updatePermiso: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermisoService,
        { provide: PERMISO_REPOSITORY, useValue: mockPermisoRepository },
      ],
    }).compile();

    service = module.get<PermisoService>(PermisoService);
  });

  describe('findByRol', () => {
    it('deberia devolver los permisos de un rol mapeados', async () => {
      mockPermisoRepository.findByRol.mockResolvedValue([buildPermiso()]);

      const result = await service.findByRol(5);

      expect(mockPermisoRepository.findByRol).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false });
    });
  });

  describe('findByUsuario - permisos efectivos de un usuario via su rol', () => {
    it('deberia devolver los permisos del usuario en el formato reducido (sin id/rol)', async () => {
      mockPermisoRepository.findByUsuario.mockResolvedValue([buildPermiso()]);

      const result = await service.findByUsuario(10);

      expect(mockPermisoRepository.findByUsuario).toHaveBeenCalledWith(10);
      expect(result).toEqual([{ modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false }]);
    });

    it('deberia devolver un array vacio si el usuario no tiene permisos (sin rol o rol sin permisos)', async () => {
      mockPermisoRepository.findByUsuario.mockResolvedValue([]);

      const result = await service.findByUsuario(999);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el permiso no existe', async () => {
      mockPermisoRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el permiso mapeado cuando existe', async () => {
      mockPermisoRepository.findById.mockResolvedValue(buildPermiso());

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
    });
  });

  describe('update - actualizar permisos de un rol existente (persistencia de canRead/canWrite)', () => {
    it('lanza NotFoundException si el permiso no existe', async () => {
      mockPermisoRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPermisoRepository.updatePermiso).not.toHaveBeenCalled();
    });

    it('deberia persistir el nuevo canRead/canWrite para el permiso existente', async () => {
      mockPermisoRepository.findById.mockResolvedValue(buildPermiso());
      mockPermisoRepository.updatePermiso.mockResolvedValue(
        buildPermiso({ canRead: true, canWrite: true }),
      );

      const result = await service.update(1, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canWrite: true,
      });

      expect(mockPermisoRepository.updatePermiso).toHaveBeenCalledWith(1, true, true);
      expect(result.canWrite).toBe(true);
    });

    it('desasignar (canRead:false, canWrite:false) tambien se persiste correctamente', async () => {
      mockPermisoRepository.findById.mockResolvedValue(buildPermiso({ canRead: true, canWrite: true }));
      mockPermisoRepository.updatePermiso.mockResolvedValue(
        buildPermiso({ canRead: false, canWrite: false }),
      );

      const result = await service.update(1, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: false,
        canWrite: false,
      });

      expect(mockPermisoRepository.updatePermiso).toHaveBeenCalledWith(1, false, false);
      expect(result.canRead).toBe(false);
      expect(result.canWrite).toBe(false);
    });
  });
});
