import { User } from '../entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  createUser(user: Partial<User>): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  incrementFailedAttempts(userId: number): Promise<void>;
  lockUser(userId: number, lockedUntil: Date): Promise<void>;
  resetFailedAttempts(userId: number): Promise<void>;
  countByEmpresa(empresaId: number): Promise<number>;

}

export const USER_REPOSITORY = 'USER_REPOSITORY';