import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RevokedToken } from '../entities/revoked-token.entity';
import { IRevokedTokenRepository } from './revoked-token-repository.interface';

@Injectable()
export class RevokedTokenRepository implements IRevokedTokenRepository {
  constructor(
    @InjectRepository(RevokedToken)
    private readonly repository: Repository<RevokedToken>,
  ) {}

  async createRevokedToken(
    revokedToken: Partial<RevokedToken>,
  ): Promise<RevokedToken> {
    const newRevokedToken = this.repository.create(revokedToken);
    return this.repository.save(newRevokedToken);
  }

  async existsActiveByTokenHash(
    tokenHash: string,
    currentDate: Date,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        tokenHash,
        expiresAt: MoreThan(currentDate),
        deletedAt: IsNull(),
      },
    });

    return count > 0;
  }
}
