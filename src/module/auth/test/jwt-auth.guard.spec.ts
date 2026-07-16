import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../auth.service';

import { REVOKED_TOKEN_REPOSITORY } from '../repository/revoked-token-repository.interface';
import { USER_REPOSITORY } from '../../user/repository/user-repository.interface';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  let mockReflector: {
    getAllAndOverride: jest.Mock;
  };

  let mockJwtService: {
    verifyAsync: jest.Mock;
  };

  let mockRevokedTokenRepository: {
    existsActiveByTokenHash: jest.Mock;
  };

  let mockUserRepository: {
    findById: jest.Mock;
  };

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    mockJwtService = {
      verifyAsync: jest.fn(),
    };

    mockRevokedTokenRepository = {
      existsActiveByTokenHash: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: REVOKED_TOKEN_REPOSITORY,
          useValue: mockRevokedTokenRepository,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    jest.clearAllMocks();
  });

  const mockContext = (
    token?: string,
    isPublic = false,
  ): ExecutionContext => {
    mockReflector.getAllAndOverride.mockReturnValue(isPublic);

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: token ? `Bearer ${token}` : undefined,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('rutas publicas', () => {
    it('deberia permitir acceso sin token cuando la ruta es publica', async () => {
      const context = mockContext(undefined, true);

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect(
        mockRevokedTokenRepository.existsActiveByTokenHash,
      ).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('token ausente', () => {
    it('deberia lanzar UnauthorizedException cuando no hay token', async () => {
      const context = mockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('token revocado', () => {
    it('deberia lanzar UnauthorizedException cuando el token esta revocado', async () => {
      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        true,
      );

      const context = mockContext('token_valido');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(
        mockRevokedTokenRepository.existsActiveByTokenHash,
      ).toHaveBeenCalledWith(
        AuthService.hashToken('token_valido'),
        expect.any(Date),
      );

      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('token invalido', () => {
    it('deberia lanzar UnauthorizedException cuando el token no puede verificarse', async () => {
      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        false,
      );

      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('invalid token'),
      );

      const context = mockContext('token_invalido');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(
        mockRevokedTokenRepository.existsActiveByTokenHash,
      ).toHaveBeenCalledWith(
        AuthService.hashToken('token_invalido'),
        expect.any(Date),
      );

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('usuario inexistente', () => {
    it('deberia lanzar UnauthorizedException cuando el usuario no existe', async () => {
      const payload = {
        sub: 1,
        email: 'admin@empresa.com',
        role: 'admin',
      };

      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        false,
      );

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      mockUserRepository.findById.mockResolvedValue(null);

      const context = mockContext('token_valido');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('usuario inactivo', () => {
    it('deberia lanzar UnauthorizedException cuando el usuario esta inactivo', async () => {
      const payload = {
        sub: 1,
        email: 'admin@empresa.com',
        role: 'admin',
      };

      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        false,
      );

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      mockUserRepository.findById.mockResolvedValue({
        id: 1,
        isActive: false,
      });

      const context = mockContext('token_valido');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('token valido', () => {
    it('deberia permitir acceso y setear user en el request cuando el token es valido', async () => {
      const payload = {
        sub: 1,
        email: 'admin@empresa.com',
        role: 'admin',
      };

      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        false,
      );

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      mockUserRepository.findById.mockResolvedValue({
        id: 1,
        isActive: true,
      });

      const request = {
        headers: {
          authorization: 'Bearer token_valido',
        },
        user: undefined,
        accessToken: undefined,
      };

      mockReflector.getAllAndOverride.mockReturnValue(false);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      expect(request.user).toEqual(payload);
      expect(request.accessToken).toBe('token_valido');

      expect(
        mockRevokedTokenRepository.existsActiveByTokenHash,
      ).toHaveBeenCalledWith(
        AuthService.hashToken('token_valido'),
        expect.any(Date),
      );

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'token_valido',
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
    });
  });
});