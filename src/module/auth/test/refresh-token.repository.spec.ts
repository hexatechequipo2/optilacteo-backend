import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, MoreThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RefreshTokenRepository } from '../repository/refresh-token.repository';

describe('RefreshTokenRepository', () => {
  let refreshTokenRepository: RefreshTokenRepository;
  let mockTypeOrmRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockTypeOrmRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenRepository,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deberia crear y guardar un refresh token correctamente', async () => {
      // Arrange
      const tokenData: Partial<RefreshToken> = {
        tokenHash: 'hash_abc123',
        userId: 1,
        empresaId: 1,
        familyId: 'family-uuid',
        expiresAt: new Date('2026-12-31'),
      };
      const createdEntity = { id: 1, ...tokenData } as RefreshToken;
      mockTypeOrmRepository.create.mockReturnValue(createdEntity);
      mockTypeOrmRepository.save.mockResolvedValue(createdEntity);

      // Act
      const result = await refreshTokenRepository.create(tokenData);

      // Assert
      expect(mockTypeOrmRepository.create).toHaveBeenCalledWith(tokenData);
      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(createdEntity);
    });
  });

  describe('findByTokenHash', () => {
    it('deberia retornar el token cuando existe', async () => {
      // Arrange
      const token = { id: 1, tokenHash: 'hash_abc123' } as RefreshToken;
      mockTypeOrmRepository.findOne.mockResolvedValue(token);

      // Act
      const result = await refreshTokenRepository.findByTokenHash('hash_abc123');

      // Assert
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash: 'hash_abc123' },
      });
      expect(result).toEqual(token);
    });

    it('deberia retornar null cuando el token no existe', async () => {
      // Arrange
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await refreshTokenRepository.findByTokenHash('hash_inexistente');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findActiveByTokenHash', () => {
    it('deberia buscar solo tokens activos y no expirados', async () => {
      // Arrange
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      // Act
      await refreshTokenRepository.findActiveByTokenHash('hash_abc123');

      // Assert
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: {
          tokenHash: 'hash_abc123',
          revokedAt: IsNull(),
          expiresAt: MoreThan(expect.any(Date)),
        },
      });
    });
  });

  describe('revokeById', () => {
    it('deberia marcar el token como revocado con revokedAt', async () => {
      // Arrange
      mockTypeOrmRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await refreshTokenRepository.revokeById(1);

      // Assert
      expect(mockTypeOrmRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });

    it('deberia incluir replacedByHash cuando se provee', async () => {
      // Arrange
      mockTypeOrmRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await refreshTokenRepository.revokeById(1, 'nuevo_hash');

      // Assert
      expect(mockTypeOrmRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          revokedAt: expect.any(Date),
          replacedByHash: 'nuevo_hash',
        }),
      );
    });
  });

  describe('revokeFamily', () => {
    it('deberia revocar todos los tokens activos de una familia', async () => {
      // Arrange
      mockTypeOrmRepository.update.mockResolvedValue({ affected: 3 });

      // Act
      await refreshTokenRepository.revokeFamily('family-uuid');

      // Assert
      expect(mockTypeOrmRepository.update).toHaveBeenCalledWith(
        { familyId: 'family-uuid', revokedAt: IsNull() },
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });
});
