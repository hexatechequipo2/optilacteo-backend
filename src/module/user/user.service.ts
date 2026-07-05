import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { USER_REPOSITORY } from './repository/user-repository.interface';
import type { IUserRepository } from './repository/user-repository.interface';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './mappers/user.mapper';

import { User } from './entities/user.entity';
import { Empresa } from '../empresa/entities/empresa.entity';
import { Rol } from '../rol/entities/rol.entity';

import { EmpresaService } from '../empresa/empresa.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,

    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,

    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,

    private readonly empresaService: EmpresaService,
  ) {}

  async create(dto: CreateUserDto) {
    const empresa = await this.findEmpresaOrFail(dto.empresaId);
    const rol = await this.findRolOrFail(dto.rolId);

    const limiteUsuarios = await this.empresaService.getLimiteUsuarios(dto.empresaId);

    const usuariosActuales = await this.userRepository.countByEmpresa(dto.empresaId);

    if (usuariosActuales >= limiteUsuarios) {
      throw new BadRequestException(
        `La empresa alcanzó el límite de usuarios para su plan`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const userToCreate = UserMapper.toEntity(
      dto,
      empresa,
      rol,
      hashedPassword,
    );

    const created = await this.userRepository.createUser(userToCreate);

    this.logger.log(`Usuario creado: ${created.email}`);

    return UserMapper.toResponse(created);
  }

  async findAll() {
    const users = await this.userRepository.findAll();
    return UserMapper.toResponseList(users);
  }

  async findOne(id: number) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return UserMapper.toResponse(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    const update: Partial<User> = {};

    if (dto.name !== undefined) update.name = dto.name;
    if (dto.email !== undefined) update.email = dto.email;

    if (dto.password) {
      update.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (dto.rolId) {
      update.rol = await this.findRolOrFail(dto.rolId);
    }

    if (dto.empresaId) {
      update.empresa = await this.findEmpresaOrFail(dto.empresaId);
    }

    const updated = await this.userRepository.updateUser(id, update);

    return UserMapper.toResponse(updated);
  }

  async deactivate(id: number) {
    await this.findOne(id);

    const updated = await this.userRepository.updateUser(id, {
      isActive: false,
    });

    return UserMapper.toResponse(updated);
  }

  async activate(id: number) {
    await this.findOne(id);

    const updated = await this.userRepository.updateUser(id, {
      isActive: true,
    });

    return UserMapper.toResponse(updated);
  }

  // -------------------------
  // HELPERS
  // -------------------------

  private async findEmpresaOrFail(id: number) {
    const empresa = await this.empresaRepository.findOneBy({ id });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }

  private async findRolOrFail(id: number) {
    const rol = await this.rolRepository.findOneBy({ id });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol;
  }
}