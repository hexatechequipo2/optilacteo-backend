import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { ROLES } from '../rol/constants/roles.constants';
import type { TenantContext } from '../../common/types/tenant-context.type';

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

  async create(dto: CreateUserDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(dto.empresaId, tenant);
    const empresa = await this.findEmpresaOrFail(empresaId);
    const rol = await this.findRolOrFail(dto.rolId);
    this.guardAsignacionDeRol(rol, tenant);

    const limiteUsuarios = await this.empresaService.getLimiteUsuarios(empresaId);

    const usuariosActuales = await this.userRepository.countByEmpresa(empresaId);

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

  async findAll(tenant: TenantContext) {
    const users = await this.userRepository.findAll(tenant);
    return UserMapper.toResponseList(users);
  }

  async findOne(id: number) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return UserMapper.toResponse(user);
  }

  async update(id: number, dto: UpdateUserDto, tenant: TenantContext) {
    await this.findOne(id);

    const update: Partial<User> = {};

    if (dto.name !== undefined) update.name = dto.name;
    if (dto.email !== undefined) update.email = dto.email;

    if (dto.password) {
      update.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (dto.rolId) {
      const rol = await this.findRolOrFail(dto.rolId);
      this.guardAsignacionDeRol(rol, tenant);
      update.rol = rol;
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

  async unlock(id: number) {
    await this.findOne(id); // valida existencia, tira 404 si no existe

    await this.userRepository.resetFailedAttempts(id);

    this.logger.log(`Usuario desbloqueado manualmente: id=${id}`);

    return this.findOne(id);
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

  // Un Gerente siempre crea usuarios dentro de su propia empresa: se ignora
  // el empresaId que venga en el body y se fuerza el del JWT (mismo criterio
  // que ProveedoresService.resolveEmpresaId). El Administrador sí puede
  // elegir la empresa del nuevo usuario, por eso el DTO la exige siempre.
  private resolveEmpresaId(bodyEmpresaId: number, tenant: TenantContext): number {
    if (tenant.rolNombre === ROLES.ADMINISTRADOR) {
      return bodyEmpresaId;
    }
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada');
    }
    return tenant.empresaId;
  }

  // Un Gerente puede crear/editar usuarios de su empresa pero no puede
  // otorgar el rol Administrador (evita escalar privilegios por fuera
  // del selector del frontend).
  private guardAsignacionDeRol(rol: Rol, tenant: TenantContext) {
    if (
      tenant.rolNombre === ROLES.GERENTE &&
      rol.nombre === ROLES.ADMINISTRADOR
    ) {
      throw new ForbiddenException(
        'Un Gerente no puede asignar el rol Administrador',
      );
    }
  }
}
