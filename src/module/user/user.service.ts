import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from './repository/user-repository.interface';
import { USER_REPOSITORY } from './repository/user-repository.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './mappers/user.mapper';
import { User } from './entities/user.entity';
import { Empresa } from '../empresa/entities/empresa.entity';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  async create(dto: CreateUserDto) {
    const empresa = await this.findEmpresaOrFail(dto.empresaId);

    // La contraseña se hashea en el Service (no en el Mapper) porque bcrypt.hash es async
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const userToCreate = UserMapper.toEntity(dto, empresa, hashedPassword);
    const created = await this.userRepository.createUser(userToCreate);

    this.logger.log(`Usuario creado: [${created.email}]`);

    return UserMapper.toResponse(created);
  }

  async findAll() {
    const users = await this.userRepository.findAll();
    return UserMapper.toResponseList(users);
  }

  async findOne(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return UserMapper.toResponse(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id); // valida que el usuario exista, lanza 404 si no

    // Solo se hashea si el dto trae password; si no viene, no se toca el campo
    const hashedPassword =
      dto.password !== undefined
        ? await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
        : undefined;

    const userToUpdate: Partial<User> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(hashedPassword !== undefined && { password: hashedPassword }),
      ...(dto.role !== undefined && { role: dto.role }),
    };

    if (dto.empresaId !== undefined) {
      userToUpdate.empresa = await this.findEmpresaOrFail(dto.empresaId);
    }

    const updated = await this.userRepository.updateUser(id, userToUpdate);
    return UserMapper.toResponse(updated);
  }

  private async findEmpresaOrFail(empresaId: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findOneBy({ id: empresaId });
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${empresaId} no encontrada`);
    }
    return empresa;
  }

  async deactivate(id: number) {
  await this.findOne(id);
  const updated = await this.userRepository.updateUser(id, { isActive: false });
  return UserMapper.toResponse(updated);
  }

  async activate(id: number) {
    await this.findOne(id);
    const updated = await this.userRepository.updateUser(id, { isActive: true });
    return UserMapper.toResponse(updated);
  }
}