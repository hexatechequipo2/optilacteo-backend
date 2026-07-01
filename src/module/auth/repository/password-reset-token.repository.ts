import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { IPasswordResetTokenRepository } from './password-reset-token.interface';

@Injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repo: Repository<PasswordResetTokenEntity>,
  ) {}

  async save(token: Partial<PasswordResetTokenEntity>): Promise<PasswordResetTokenEntity> {
    return this.repo.save(token);
  }

  async findByToken(token: string): Promise<PasswordResetTokenEntity | null> {
    return this.repo.findOne({ where: { token } });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.repo.update(id, { used: true });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}