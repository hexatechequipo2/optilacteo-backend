import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IUserRepository } from './repository/user-repository.interface';
import { USER_REPOSITORY } from './repository/user-repository.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './mappers/user.mapper';
import { User } from './entities/user.entity';
import { Empresa } from '../empresa/entities/empresa.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  async create(dto: CreateUserDto) {
    const empresa = await this.findEmpresaOrFail(dto.empresaId);

    const userToCreate = UserMapper.toEntity(dto, empresa);
    const created = await this.userRepository.createUser(userToCreate);

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

    const userToUpdate: Partial<User> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.password !== undefined && { password: dto.password }),
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