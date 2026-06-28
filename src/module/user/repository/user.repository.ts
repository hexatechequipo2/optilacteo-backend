import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository } from './user-repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: { empresa: true },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: { empresa: true },
    });
  }

  async findAll(): Promise<User[]> {
    return this.repository.find({ relations: { empresa: true } });
  }

  async createUser(user: Partial<User>): Promise<User> {
    const newUser = this.repository.create(user);
    return this.repository.save(newUser);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    await this.repository.update(id, user);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User with id ${id} not found after update`);
    }
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await this.repository.delete(id);
    }
  
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.repository.update(userId, { password: passwordHash });
  }

  async incrementFailedAttempts(userId: number): Promise<void> {
    await this.repository.increment({ id: userId }, 'failedLoginAttempts', 1);
  }

  async lockUser(userId: number, lockedUntil: Date): Promise<void> {
    await this.repository.update(userId, { lockedUntil });
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    await this.repository.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }
}