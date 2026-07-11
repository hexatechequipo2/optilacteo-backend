import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { REVOKED_TOKEN_REPOSITORY } from '../repository/revoked-token-repository.interface';
import { Test, TestingModule } from '@nestjs/testing';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };
  let mockJwtService: { verifyAsync: jest.Mock };
  let mockRevokedTokenRepository: { existsActiveByTokenHash: jest.Mock };

  beforeEach(async () => {
    mockReflector = { getAllAndOverride: jest.fn() };
    mockJwtService = { verifyAsync: jest.fn() };
    mockRevokedTokenRepository = { existsActiveByTokenHash: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: REVOKED_TOKEN_REPOSITORY,
          useValue: mockRevokedTokenRepository,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jest.clearAllMocks();
  });

  const mockContext = (token?: string, isPublic = false): ExecutionContext => {
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
      // Arrange
      const context = mockContext(undefined, true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('token ausente', () => {
    it('deberia lanzar UnauthorizedException cuando no hay token', async () => {
      // Arrange
      const context = mockContext(undefined, false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token revocado', () => {
    it('deberia lanzar UnauthorizedException cuando el token esta revocado', async () => {
      // Arrange
      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        true,
      );
      const context = mockContext('token_valido', false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token invalido', () => {
    it('deberia lanzar UnauthorizedException cuando el token no puede verificarse', async () => {
      // Arrange
      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        false,
      );
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));
      const context = mockContext('token_invalido', false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token valido', () => {
    it('deberia permitir acceso y setear user en el request cuando el token es valido', async () => {
      // Arrange
      const payload = { sub: 1, email: 'admin@empresa.com', role: 'admin' };
      mockRevokedTokenRepository.existsActiveByTokenHash.mockResolvedValue(
        false,
      );
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      const request = {
        headers: { authorization: 'Bearer token_valido' },
        user: undefined,
        accessToken: undefined,
      };
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(request.user).toEqual(payload);
      expect(request.accessToken).toBe('token_valido');
    });
  });
});
