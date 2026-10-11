
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  IPasswordResetTokenRepository,
} from '../repository/password-reset-token.interface';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

describe('IPasswordResetTokenRepository', () => {
  let repository: IPasswordResetTokenRepository;

  const tokenGuardado = {
    id: 'token-id-123',
    userId: 'user-id-123',
    token: 'token-hash-abc',
    expiresAt: new Date('2026-12-31T23:59:59.000Z'),
    used: false,
  } as unknown as PasswordResetTokenEntity;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(tokenGuardado),
      findByToken: jest.fn().mockResolvedValue(tokenGuardado),
      markAsUsed: jest.fn().mockResolvedValue(undefined),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('debe exportar el token de inyección correcto', () => {
    expect(PASSWORD_RESET_TOKEN_REPOSITORY).toBe(
      'PASSWORD_RESET_TOKEN_REPOSITORY',
    );
  });

  it('debe guardar un token y devolver la entidad guardada', async () => {
    const token = {
      userId: 'user-id-123',
      token: 'token-hash-abc',
    } as Partial<PasswordResetTokenEntity>;

    await expect(repository.save(token)).resolves.toBe(tokenGuardado);

    expect(repository.save).toHaveBeenCalledWith(token);
  });

  it('debe devolver un token cuando existe', async () => {
    await expect(repository.findByToken('token-hash-abc')).resolves.toBe(
      tokenGuardado,
    );

    expect(repository.findByToken).toHaveBeenCalledWith('token-hash-abc');
  });

  it('debe devolver null cuando el token no existe', async () => {
    jest.spyOn(repository, 'findByToken').mockResolvedValue(null);

    await expect(repository.findByToken('token-inexistente')).resolves.toBeNull();
  });

  it('debe marcar un token como utilizado', async () => {
    await expect(repository.markAsUsed('token-id-123')).resolves.toBeUndefined();

    expect(repository.markAsUsed).toHaveBeenCalledWith('token-id-123');
  });

  it('debe eliminar los tokens asociados a un usuario', async () => {
    await expect(
      repository.deleteByUserId('user-id-123'),
    ).resolves.toBeUndefined();

    expect(repository.deleteByUserId).toHaveBeenCalledWith('user-id-123');
  });

  it('debe propagar errores al guardar un token', async () => {
    jest.spyOn(repository, 'save').mockRejectedValue(new Error('Error de persistencia'));

    await expect(
      repository.save({ userId: 'user-id-123' }),
    ).rejects.toThrow('Error de persistencia');
  });

  it('debe propagar errores al buscar un token', async () => {
    jest.spyOn(repository, 'findByToken').mockRejectedValue(new Error('Error de consulta'));

    await expect(
      repository.findByToken('token-hash-abc'),
    ).rejects.toThrow('Error de consulta');
  });
});
