import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { User } from '../../user/entities/user.entity';

describe('PasswordResetTokenEntity', () => {
  it('debe instanciar correctamente con todas sus propiedades', () => {
    const entity = new PasswordResetTokenEntity();
    const mockUser = new User();
    mockUser.id = 123;

    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 60 * 1000);

    entity.id = 'entity-uuid-123';
    entity.token = 'reset-token-uuid-456';
    entity.userId = 'user-uuid-123';
    entity.user = mockUser;
    entity.tenant_id = 'tenant-abc';
    entity.expiresAt = expires;
    entity.used = false;
    entity.created_at = now;

    expect(entity).toBeDefined();
    expect(entity.id).toBe('entity-uuid-123');
    expect(entity.token).toBe('reset-token-uuid-456');
    expect(entity.userId).toBe('user-uuid-123');
    expect(entity.user).toBe(mockUser);
    expect(entity.tenant_id).toBe('tenant-abc');
    expect(entity.expiresAt).toBe(expires);
    expect(entity.used).toBe(false);
    expect(entity.created_at).toBe(now);
  });

  it('debe permitir tenant_id como null', () => {
    const entity = new PasswordResetTokenEntity();
    entity.tenant_id = null;

    expect(entity.tenant_id).toBeNull();
  });

  it('debe permitir cambiar el estado de used a true', () => {
    const entity = new PasswordResetTokenEntity();
    entity.used = false;

    expect(entity.used).toBe(false);

    entity.used = true;
    expect(entity.used).toBe(true);
  });
});
