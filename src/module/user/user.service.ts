import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  ConflictException,
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
import { RolService } from '../rol/rol.service';
import type { AuditCambios } from '../audit/decorators/audit-log.decorator';
import { EmpresaService } from '../empresa/empresa.service';
import { ROLES } from '../rol/constants/roles.constants';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { UserFilterQueryDto } from './dto/user-filter-query.dto';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../../common/dto/paginated-response.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    private readonly empresaService: EmpresaService,
    private readonly rolService: RolService,
  ) {}

  // Validación de seguridad para aislamiento (CP-08/CP-09)
  private assertOwnEmpresa(user: User, tenant: TenantContext) {
    if (
      tenant.rolNombre !== ROLES.ADMINISTRADOR &&
      user.empresa!.id !== tenant.empresaId
    ) {
      throw new NotFoundException('Usuario no encontrado'); // 404 para ocultar existencia
    }
  }

  /**
   * Alta en la empresa ya resuelta por EmpresaObjetivoGuard (la propia, o la
   * elegida por el Administrador). El rol debe ser del catálogo o de esa
   * empresa, activo y nunca Administrador.
   */
  async create(dto: CreateUserDto, empresaId: number) {
    const empresa = await this.findEmpresaOrFail(empresaId);
    const rol = await this.rolService.obtenerAsignable(dto.rolId, empresaId);

    const usuarioPorEmail = await this.userRepository.findByEmail(dto.email);
    if (usuarioPorEmail) {
      throw new ConflictException({
        field: 'email',
        message: 'Ya existe un usuario registrado con ese email.',
      });
    }
    const limiteUsuarios =
      await this.empresaService.getLimiteUsuarios(empresaId);
    const usuariosActuales =
      await this.userRepository.countByEmpresa(empresaId);

    if (usuariosActuales >= limiteUsuarios) {
      throw new BadRequestException(`La empresa alcanzó el límite de usuarios`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const userToCreate = UserMapper.toEntity(dto, empresa, rol, hashedPassword);
    const created = await this.userRepository.createUser(userToCreate);

    return UserMapper.toResponse(created);
  }

  async findAll(
    tenant: TenantContext,
    query: UserFilterQueryDto,
  ): Promise<PaginatedResponse<ReturnType<typeof UserMapper.toResponse>>> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepository.findAllPaginated(
      tenant,
      skip,
      limit,
      filters,
    );
    return buildPaginatedResponse(
      UserMapper.toResponseList(users),
      page,
      limit,
      total,
    );
  }

  async findOne(id: number, tenant: TenantContext) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    this.assertOwnEmpresa(user, tenant);
    return UserMapper.toResponse(user);
  }

  /**
   * Edición dentro de la empresa ya resuelta. `empresaId` del DTO solo elige
   * la empresa (Administrador); no mueve al usuario de empresa. El rol no se
   * cambia acá: va por PUT /roles/usuarios/:usuarioId.
   */
  async update(
    id: number,
    dto: UpdateUserDto,
    empresaId: number,
  ): Promise<{
    usuario: ReturnType<typeof UserMapper.toResponse>;
    cambios: AuditCambios;
  }> {
    const user = await this.userRepository.findById(id);
    if (!user || user.empresa?.id !== empresaId) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const antes = this.snapshot(user);

    if (dto.email && dto.email !== user.email) {
      const usuarioPorEmail = await this.userRepository.findByEmail(dto.email);

      if (usuarioPorEmail) {
        throw new ConflictException({
          field: 'email',
          message: 'Ya existe un usuario registrado con ese email.',
        });
      }
    }

    const update: Partial<User> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.email !== undefined) update.email = dto.email;
    if (dto.password)
      update.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // Sin campos a cambiar (p. ej. solo empresaId): devuelve el usuario tal cual.
    const updated = Object.keys(update).length
      ? await this.userRepository.updateUser(id, update)
      : ((await this.userRepository.findById(id)) as User);
    return {
      usuario: UserMapper.toResponse(updated),
      cambios: { antes, despues: this.snapshot(updated) },
    };
  }

  async deactivate(id: number, tenant: TenantContext) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.assertOwnEmpresa(user, tenant);

    const updated = await this.userRepository.updateUser(id, {
      isActive: false,
    });
    return UserMapper.toResponse(updated);
  }

  async activate(id: number, tenant: TenantContext) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.assertOwnEmpresa(user, tenant);

    const updated = await this.userRepository.updateUser(id, {
      isActive: true,
    });
    return UserMapper.toResponse(updated);
  }

  async unlock(id: number, tenant: TenantContext) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.assertOwnEmpresa(user, tenant);

    await this.userRepository.resetFailedAttempts(id);
    return this.findOne(id, tenant);
  }

  // --- HELPERS ---
  private async findEmpresaOrFail(id: number) {
    const empresa = await this.empresaRepository.findOneBy({ id });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  /** Lo auditable de un usuario (sin contraseña). */
  private snapshot(user: User) {
    return {
      name: user.name,
      email: user.email,
      rolId: user.rol?.id ?? null,
      rolNombre: user.rol?.nombre ?? null,
      empresaId: user.empresa?.id ?? null,
    };
  }
}
