import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, MoreThan } from 'typeorm';
import { RevokedToken } from '../entities/revoked-token.entity';
import { RevokedTokenRepository } from '../repository/revoked-token.repository';

describe('RevokedTokenRepository', () => {
  let revokedTokenRepository: RevokedTokenRepository;
  let mockTypeOrmRepository: {
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(async () => {
    mockTypeOrmRepository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevokedTokenRepository,
        {
          provide: getRepositoryToken(RevokedToken),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    revokedTokenRepository = module.get<RevokedTokenRepository>(
      RevokedTokenRepository,
    );
    jest.clearAllMocks();
  });

  describe('createRevokedToken', () => {
    it('deberia crear y guardar un token revocado correctamente', async () => {
      // Arrange
      const tokenData: Partial<RevokedToken> = {
        tokenHash: 'hash_abc123',
        userId: 1,
        empresaId: 1,
        expiresAt: new Date('2026-12-31'),
      };
      const createdEntity = { id: 1, ...tokenData } as RevokedToken;
      mockTypeOrmRepository.create.mockReturnValue(createdEntity);
      mockTypeOrmRepository.save.mockResolvedValue(createdEntity);

      // Act
      const result = await revokedTokenRepository.createRevokedToken(tokenData);

      // Assert
      expect(mockTypeOrmRepository.create).toHaveBeenCalledWith(tokenData);
      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(createdEntity);
    });
  });

  describe('existsActiveByTokenHash', () => {
    it('deberia retornar true cuando existe un token activo con ese hash', async () => {
      // Arrange
      const tokenHash = 'hash_abc123';
      const currentDate = new Date();
      mockTypeOrmRepository.count.mockResolvedValue(1);

      // Act
      const result = await revokedTokenRepository.existsActiveByTokenHash(
        tokenHash,
        currentDate,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockTypeOrmRepository.count).toHaveBeenCalledWith({
        where: {
          tokenHash,
          expiresAt: MoreThan(currentDate),
          deletedAt: IsNull(),
        },
      });
    });

    it('deberia retornar false cuando no existe un token activo con ese hash', async () => {
      // Arrange
      const tokenHash = 'hash_inexistente';
      const currentDate = new Date();
      mockTypeOrmRepository.count.mockResolvedValue(0);

      // Act
      const result = await revokedTokenRepository.existsActiveByTokenHash(
        tokenHash,
        currentDate,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('deberia retornar false cuando el token existe pero ya expiro', async () => {
      // Arrange
      const tokenHash = 'hash_expirado';
      const currentDate = new Date();
      mockTypeOrmRepository.count.mockResolvedValue(0);

      // Act
      const result = await revokedTokenRepository.existsActiveByTokenHash(
        tokenHash,
        currentDate,
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
