import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

export interface IPasswordResetTokenRepository {
  save(token: Partial<PasswordResetTokenEntity>): Promise<PasswordResetTokenEntity>;
  findByToken(token: string): Promise<PasswordResetTokenEntity | null>;
  markAsUsed(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export const PASSWORD_RESET_TOKEN_REPOSITORY = 'PASSWORD_RESET_TOKEN_REPOSITORY';