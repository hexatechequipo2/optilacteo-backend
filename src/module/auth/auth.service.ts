import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from '../user/repository/user-repository.interface';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { LoginDto } from './dto/login.dto';

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    role: string;
    empresa: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(dto.email);

    // Mensaje genérico para no revelar qué campo falló (email o contraseña)
    if (!user) {
      this.logger.warn(`Intento de login fallido: email no encontrado [${dto.email}]`);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      this.logger.warn(`Intento de login fallido: contraseña incorrecta para [${dto.email}]`);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.isActive) {
      this.logger.warn(`Intento de login de usuario inactivo: [${dto.email}]`);
      throw new ForbiddenException('El usuario está inactivo. Contacte al administrador.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwtService.signAsync(payload);

    this.logger.log(`Login exitoso para usuario [${dto.email}]`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        empresa: user.empresa?.name ?? '',
      },
    };
  }
}
