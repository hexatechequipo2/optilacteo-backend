import { RevokedToken } from '../entities/revoked-token.entity';

export interface IRevokedTokenRepository {
  createRevokedToken(
    revokedToken: Partial<RevokedToken>,
  ): Promise<RevokedToken>;
  existsActiveByTokenHash(
    tokenHash: string,
    currentDate: Date,
  ): Promise<boolean>;
}

export const REVOKED_TOKEN_REPOSITORY = 'REVOKED_TOKEN_REPOSITORY';
