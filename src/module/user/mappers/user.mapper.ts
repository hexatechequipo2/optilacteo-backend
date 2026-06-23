import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { Empresa } from '../../empresa/entities/empresa.entity';

export class UserMapper {
  
  /**
   * Convierte el CreateUserDto + la Empresa ya resuelta en una instancia de User,
   * lista para persistir. No incluye el id (lo genera la base de datos).
   */
  static toEntity(dto: CreateUserDto, empresa: Empresa): Partial<User> {
    return {
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      empresa: empresa,
    };
  }

  /**
   * Convierte una entity User en un objeto plano seguro para devolver al cliente,
   * excluyendo el password.
   */
    static toResponse(user: User) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        empresa: user.empresa
        ? { id: user.empresa.id, name: user.empresa.name }
        : null,
    };
    }

  /**
   * Convierte un array de entities User en un array de respuestas seguras.
   */
  static toResponseList(users: User[]) {
    return users.map((user) => this.toResponse(user));
  }
}