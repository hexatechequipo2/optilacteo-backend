import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Rol } from '../../rol/entities/rol.entity';

export class UserMapper {
  static toEntity(
    dto: CreateUserDto,
    empresa: Empresa,
    rol: Rol,
    hashedPassword: string,
  ): Partial<User> {
    return {
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      empresa,
      rol,
    };
  }

  static toResponse(user: User) {
    const isLocked = !!(user.lockedUntil && user.lockedUntil > new Date());

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      rolId: user.rol?.id ?? null,
      rolNombre: user.rol?.nombre ?? null,
      empresa: user.empresa
        ? {
            id: user.empresa.id,
            name: user.empresa.name,
          }
        : null,
      isLocked,
      lockedUntil: user.lockedUntil ?? null,
    };
  }

  static toResponseList(users: User[]) {
    return users.map((u) => this.toResponse(u));
  }
}