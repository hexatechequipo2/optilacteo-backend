import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetTokenRepository } from '../repository/password-reset-token.repository';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

describe('PasswordResetTokenRepository', () => {
  let repository: PasswordResetTokenRepository;
  let typeOrmRepo: jest.Mocked<Repository<PasswordResetTokenEntity>>;

  const mockTypeOrmRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetTokenRepository,
        {
          provide: getRepositoryToken(PasswordResetTokenEntity),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<PasswordResetTokenRepository>(
      PasswordResetTokenRepository,
    );
    typeOrmRepo = module.get(getRepositoryToken(PasswordResetTokenEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('save', () => {
    it('debe llamar a repo.save con los datos del token y retornar la entidad guardada', async () => {
      const tokenData: Partial<PasswordResetTokenEntity> = {
        token: 'token-uuid-123',
        userId: 'user-uuid-456',
        expiresAt: new Date(),
      };

      const savedEntity = {
        id: 'entity-id-789',
        used: false,
        created_at: new Date(),
        tenant_id: null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: {} as any,
        ...tokenData,
      } as PasswordResetTokenEntity;

      mockTypeOrmRepository.save.mockResolvedValue(savedEntity);

      const result = await repository.save(tokenData);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.save).toHaveBeenCalledWith(tokenData);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedEntity);
    });
  });

  describe('findByToken', () => {
    it('debe retornar la entidad si el token existe', async () => {
      const token = 'token-uuid-123';
      const entity = {
        id: '1',
        token,
        userId: 'user-1',
        used: false,
      } as PasswordResetTokenEntity;

      mockTypeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findByToken(token);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { token } });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(entity);
    });

    it('debe retornar null si el token no existe', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByToken('token-inexistente');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { token: 'token-inexistente' },
      });
      expect(result).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('debe llamar a repo.update con el id y flag used en true', async () => {
      const tokenId = 'entity-uuid-123';
      mockTypeOrmRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await repository.markAsUsed(tokenId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.update).toHaveBeenCalledWith(tokenId, { used: true });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteByUserId', () => {
    it('debe llamar a repo.delete filtrando por userId', async () => {
      const userId = 'user-uuid-456';
      mockTypeOrmRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await repository.deleteByUserId(userId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.delete).toHaveBeenCalledWith({ userId });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeOrmRepo.delete).toHaveBeenCalledTimes(1);
    });
  });
});
