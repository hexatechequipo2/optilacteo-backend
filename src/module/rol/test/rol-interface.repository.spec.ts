import {
  ROL_REPOSITORY,
} from '../repository/rol-interface.repository';

import type {
  IRolRepository,
} from '../repository/rol-interface.repository';

describe('rol-interface.repository', () => {
  describe('ROL_REPOSITORY', () => {
    it('debe exportar el token de inyección correcto', () => {
      expect(ROL_REPOSITORY).toBe('ROL_REPOSITORY');
    });

    it('debe exportar un token de tipo string', () => {
      expect(typeof ROL_REPOSITORY).toBe('string');
    });

    it('debe mantener un token estable para inyección de dependencias', () => {
      expect(ROL_REPOSITORY).toEqual('ROL_REPOSITORY');
    });
  });

  describe('IRolRepository', () => {
    it('debe permitir definir un contrato de repositorio compatible', () => {
      const repositoryMock: jest.Mocked<IRolRepository> = {
        findById: jest.fn(),
        findAll: jest.fn(),
        findByEmpresa: jest.fn(),
        createRol: jest.fn(),
        updateRol: jest.fn(),
        deleteRol: jest.fn(),
        hasActiveUsers: jest.fn(),
        createPermisos: jest.fn(),
        findPermiso: jest.fn(),
        updatePermiso: jest.fn(),
      };

      expect(repositoryMock.findById).toBeDefined();
      expect(repositoryMock.findAll).toBeDefined();
      expect(repositoryMock.findByEmpresa).toBeDefined();
      expect(repositoryMock.createRol).toBeDefined();
      expect(repositoryMock.updateRol).toBeDefined();
      expect(repositoryMock.deleteRol).toBeDefined();
      expect(repositoryMock.hasActiveUsers).toBeDefined();
      expect(repositoryMock.createPermisos).toBeDefined();
      expect(repositoryMock.findPermiso).toBeDefined();
      expect(repositoryMock.updatePermiso).toBeDefined();
    });

    it('debe permitir configurar respuestas simuladas del repositorio', async () => {
      const repositoryMock: jest.Mocked<IRolRepository> = {
        findById: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
        findByEmpresa: jest.fn().mockResolvedValue([]),
        createRol: jest.fn(),
        updateRol: jest.fn(),
        deleteRol: jest.fn().mockResolvedValue(undefined),
        hasActiveUsers: jest.fn().mockResolvedValue(false),
        createPermisos: jest.fn().mockResolvedValue([]),
        findPermiso: jest.fn().mockResolvedValue(null),
        updatePermiso: jest.fn(),
      };

      await expect(repositoryMock.findById(1)).resolves.toBeNull();
      await expect(repositoryMock.findAll()).resolves.toEqual([]);
      await expect(repositoryMock.findByEmpresa(1)).resolves.toEqual([]);
      await expect(repositoryMock.hasActiveUsers(1)).resolves.toBe(false);
      await expect(repositoryMock.findPermiso(1, 'GESTION' as any))
        .resolves.toBeNull();

      expect(repositoryMock.findById).toHaveBeenCalledWith(1);
      expect(repositoryMock.findAll).toHaveBeenCalledWith();
      expect(repositoryMock.findByEmpresa).toHaveBeenCalledWith(1);
      expect(repositoryMock.hasActiveUsers).toHaveBeenCalledWith(1);
      expect(repositoryMock.findPermiso).toHaveBeenCalledWith(
        1,
        'GESTION',
      );
    });
  });
});
