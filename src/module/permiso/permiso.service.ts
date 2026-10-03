import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { IPermisoRepository } from './repository/permiso-interface.repository';
import { PERMISO_REPOSITORY } from './repository/permiso-interface.repository';
import { PermisoMapper } from './mappers/permiso.mapper';
import { PermisoModulo } from './entities/permiso-modulo.entity';
import { User } from '../user/entities/user.entity';

export interface AccesoUsuario {
  userId: number;
  rolId: number;
  empresaId: number | null;
  esSistema: boolean;
  permisos: PermisoModulo[];
}

@Injectable()
export class PermisoService {
  constructor(
    @Inject(PERMISO_REPOSITORY)
    private readonly permisoRepository: IPermisoRepository,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PermisoModulo)
    private readonly permisoRepo: Repository<PermisoModulo>,
  ) {}

  // ───────── lectura para la API (lo que ya tenías) ─────────

  async findByRol(rolId: number, empresaId: number) {
    const permisos = await this.permisoRepository.findByRol(rolId, empresaId);
    return PermisoMapper.toResponseList(permisos);
  }

  async findByUsuario(userId: number, empresaId: number) {
    const permisos = await this.permisoRepository.findByUsuario(userId, empresaId);
    return PermisoMapper.toUserPermisoResponse(permisos);
  }

  async findOne(id: number, empresaId: number) {
    const permiso = await this.permisoRepository.findById(id, empresaId);
    if (!permiso) {
      throw new NotFoundException(`Permiso con id ${id} no encontrado en tu empresa`);
    }
    return PermisoMapper.toResponse(permiso);
  }

  // ───────── autorización (lo que usa el guard) ─────────

  /** Lee de la BD, en cada llamada, el rol y la empresa vigentes del usuario. */
  async obtenerAcceso(userId: number): Promise<AccesoUsuario | null> {
    const u = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.rol', 'r')
      .leftJoin('u.empresa', 'e')
      .select(['u.id', 'u.isActive', 'u.rolId', 'r.id', 'r.isActive', 'r.esSistema', 'e.id'])
      .where('u.id = :userId', { userId })
      .getOne();

    if (!u || !u.isActive || !u.rol || !u.rol.isActive) return null;

    const empresaId = u.empresa?.id ?? null;
    if (u.rol.esSistema) {
      return { userId, rolId: u.rol.id, empresaId, esSistema: true, permisos: [] };
    }
    if (!empresaId) return null;

    const permisos = await this.permisoRepo.find({
      where: { empresaId, rol: { id: u.rol.id } },
    });
    return { userId, rolId: u.rol.id, empresaId, esSistema: false, permisos };
  }

  /** Llamar al crear una empresa nueva, dentro de su transacción si existe. */
  async otorgarGestionRolesAGerente(empresaId: number, m?: EntityManager): Promise<void> {
    const runner = m ?? this.permisoRepo.manager;
    await runner.query(
      `INSERT INTO "permiso_modulos"
         ("modulo","canRead","canWrite","canCreate","canUpdate","canDelete","canExport","rolId","empresaId")
       SELECT 'gestion_roles', true, true, true, true, true, false, r."id", $1
       FROM "roles" r
       WHERE r."nombre" = 'Gerente' AND r."empresaId" IS NULL
       ON CONFLICT ("empresaId","rolId","modulo") DO NOTHING`,
      [empresaId],
    );
  }
}