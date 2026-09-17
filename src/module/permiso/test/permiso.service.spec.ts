import { NotFoundException } from '@nestjs/common';
import { PermisoService } from '../permiso.service';
import { IPermisoRepository } from '../repository/permiso-interface.repository';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { PermisoModulo } from '../entities/permiso-modulo.entity';

function buildPermiso(overrides: Partial<PermisoModulo> = {}): PermisoModulo {
  return {
    id: 1,
    empresaId: 1,
    empresa: {} as any,
    modulo: ModuloSistema.DASHBOARD,
    canRead: true,
    canWrite: false,
    rol: { id: 5 } as any,
    ...overrides,
  };
}

describe('PermisoService', () => {
  let service: PermisoService;
  let mockPermisoRepository: jest.Mocked<IPermisoRepository>;

  beforeEach(() => {
    mockPermisoRepository = {
      findById: jest.fn(),
      findByRol: jest.fn(),
      findByUsuario: jest.fn(),
      findByRolYEmpresa: jest.fn(),
      updatePermiso: jest.fn(),
    };

    service = new PermisoService(mockPermisoRepository);
  });

  describe('findByRol', () => {
    it('deberia retornar lista mapeada de permisos del rol', async () => {
      const permisos = [buildPermiso()];
      mockPermisoRepository.findByRol.mockResolvedValue(permisos);

      const result = await service.findByRol(5, 1);

      expect(mockPermisoRepository.findByRol).toHaveBeenCalledWith(5, 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('modulo', ModuloSistema.DASHBOARD);
    });
  });

  describe('findByUsuario', () => {
    it('deberia retornar permisos mapeados para el usuario', async () => {
      const permisos = [buildPermiso()];
      mockPermisoRepository.findByUsuario.mockResolvedValue(permisos);

      const result = await service.findByUsuario(10, 1);

      expect(mockPermisoRepository.findByUsuario).toHaveBeenCalledWith(10, 1);
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('deberia retornar el permiso mapeado si existe', async () => {
      const permiso = buildPermiso();
      mockPermisoRepository.findById.mockResolvedValue(permiso);

      const result = await service.findOne(1, 1);

      expect(mockPermisoRepository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toHaveProperty('id', 1);
    });

    it('deberia lanzar NotFoundException si no existe el permiso', async () => {
      mockPermisoRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update - actualizar permisos de un rol existente (persistencia de canRead/canWrite)', () => {
    it('deberia persistir el nuevo canRead/canWrite para el permiso existente', async () => {
      const permisoExistente = buildPermiso({ canRead: true, canWrite: false });
      const permisoActualizado = buildPermiso({ canRead: true, canWrite: true });

      mockPermisoRepository.findById.mockResolvedValue(permisoExistente);
      mockPermisoRepository.updatePermiso.mockResolvedValue(permisoActualizado);

      const result = await service.update(1, 1, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canWrite: true,
      });

      expect(mockPermisoRepository.findById).toHaveBeenCalledWith(1, 1);
      expect(mockPermisoRepository.updatePermiso).toHaveBeenCalledWith(
        1,
        1,
        true,
        true,
      );
      expect(result.canWrite).toBe(true);
    });

    it('desasignar (canRead:false, canWrite:false) tambien se persiste correctamente', async () => {
      const permisoExistente = buildPermiso({ canRead: true, canWrite: true });
      const permisoDesasignado = buildPermiso({ canRead: false, canWrite: false });

      mockPermisoRepository.findById.mockResolvedValue(permisoExistente);
      mockPermisoRepository.updatePermiso.mockResolvedValue(permisoDesasignado);

      const result = await service.update(1, 1, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: false,
        canWrite: false,
      });

      expect(mockPermisoRepository.findById).toHaveBeenCalledWith(1, 1);
      expect(mockPermisoRepository.updatePermiso).toHaveBeenCalledWith(
        1,
        1,
        false,
        false,
      );
      expect(result.canRead).toBe(false);
      expect(result.canWrite).toBe(false);
    });
  });
});