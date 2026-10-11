import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { IPermisoRepository } from './repository/permiso-interface.repository';
import { PERMISO_REPOSITORY } from './repository/permiso-interface.repository';
import { PermisoMapper } from './mappers/permiso.mapper';
import { PermisoModulo } from './entities/permiso-modulo.entity';
import { User } from '../user/entities/user.entity';
import type { MisPermisosResponseDto } from './dto/mis-permisos-response.dto';
import { filasPermisosPorDefecto } from './constants/permisos-por-defecto.constant';

export interface AccesoUsuario {
  userId: number;
  rolId: number;
  rolNombre: string;
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
    const permisos = await this.permisoRepository.findByUsuario(
      userId,
      empresaId,
    );
    return PermisoMapper.toUserPermisoResponse(permisos);
  }

  async findOne(id: number, empresaId: number) {
    const permiso = await this.permisoRepository.findById(id, empresaId);
    if (!permiso) {
      throw new NotFoundException(
        `Permiso con id ${id} no encontrado en tu empresa`,
      );
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
      .select([
        'u.id',
        'u.isActive',
        'u.rolId',
        'r.id',
        'r.nombre',
        'r.isActive',
        'r.esSistema',
        'e.id',
      ])
      .where('u.id = :userId', { userId })
      .getOne();

    if (!u || !u.isActive || !u.rol || !u.rol.isActive) return null;

    const empresaId = u.empresa?.id ?? null;
    const rol = { rolId: u.rol.id, rolNombre: u.rol.nombre };
    if (u.rol.esSistema) {
      return { userId, ...rol, empresaId, esSistema: true, permisos: [] };
    }
    if (!empresaId) return null;

    const permisos = await this.permisoRepo.find({
      where: { empresaId, rol: { id: u.rol.id } },
    });
    return { userId, ...rol, empresaId, esSistema: false, permisos };
  }

  /** Rol y permisos vigentes del usuario, leídos de la BD con la misma función que usa el guard. */
  async obtenerMisPermisos(userId: number): Promise<MisPermisosResponseDto> {
    const acceso = await this.obtenerAcceso(userId);
    if (!acceso)
      throw new ForbiddenException(
        'Sin permisos: el usuario no tiene un rol activo asignado.',
      );
    return PermisoMapper.toMisPermisosResponse(acceso);
  }

  /**
   * Matriz por defecto de los roles de catálogo para una empresa nueva
   * (MATRIZ_PERMISOS_POR_DEFECTO). Llamar al crear la empresa, dentro de su
   * transacción si existe.
   */
  async otorgarPermisosPorDefecto(
    empresaId: number,
    m?: EntityManager,
  ): Promise<void> {
    const runner = m ?? this.permisoRepo.manager;
    const filas = filasPermisosPorDefecto();
    const valores = filas
      .map((_, i) => {
        const b = i * 8;
        return `($${b + 1}, $${b + 2}, $${b + 3}::boolean, $${b + 4}::boolean, $${b + 5}::boolean, $${b + 6}::boolean, $${b + 7}::boolean, $${b + 8}::boolean)`;
      })
      .join(', ');
    const params = filas.flatMap((p) => [
      p.rol,
      p.modulo,
      p.canRead,
      p.canCreate || p.canUpdate || p.canDelete, // canWrite (compatibilidad)
      p.canCreate,
      p.canUpdate,
      p.canDelete,
      p.canExport,
    ]);
    const empresaParam = params.length + 1;
    await runner.query(
      `INSERT INTO "permiso_modulos"
         ("modulo","canRead","canWrite","canCreate","canUpdate","canDelete","canExport","rolId","empresaId")
       SELECT d.modulo::"permiso_modulos_modulo_enum", d.r, d.w, d.c, d.u, d.d, d.e, r."id", $${empresaParam}
       FROM (VALUES ${valores}) AS d(rol, modulo, r, w, c, u, d, e)
       JOIN "roles" r ON r."nombre" = d.rol AND r."empresaId" IS NULL
       ON CONFLICT ("empresaId","rolId","modulo") DO NOTHING`,
      [...params, empresaId],
    );
  }
}
