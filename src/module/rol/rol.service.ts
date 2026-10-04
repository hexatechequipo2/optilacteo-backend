// module/rol/rol.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Rol } from './entities/rol.entity';
import { PermisoModulo } from '../permiso/entities/permiso-modulo.entity';
import {
  ModuloAdministrativo,
  MODULOS_ADMIN_OTORGABLES,
} from '../permiso/enums/modulo-administrativo.enum';
import type { ModuloPermiso } from '../permiso/enums/modulo-administrativo.enum';
import {
  gestionaRoles,
  normalizar,
  sinAcceso,
} from '../permiso/mappers/permiso-flags';
import { GuardarRolDto } from './dto/guardar-rol.dto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface ResumenPermiso {
  modulo: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface PermisoAGuardar extends ResumenPermiso {
  modulo: ModuloPermiso;
  canWrite: boolean; // compatibilidad hasta la migración 2
  empresaId: number;
  rol: { id: number };
}

@Injectable()
export class RolService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Rol) private readonly rolRepo: Repository<Rol>,
    @InjectRepository(PermisoModulo)
    private readonly permisoRepo: Repository<PermisoModulo>,
  ) {}

  // ───────────────────────── lectura ─────────────────────────

  /** Catálogo global + roles propios, con la matriz de ESTA empresa y cantidad de usuarios. */
  async listar(empresaId: number) {
    const roles = await this.rolRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.empresa', 'e')
      .where('e.id IS NULL OR e.id = :empresaId', { empresaId })
      .orderBy('r.id', 'ASC')
      .getMany();

    const permisos = await this.permisoRepo.find({
      where: { empresaId },
      relations: { rol: true },
    });

    const conteos: { rolId: number; n: number }[] =
      await this.dataSource.query(
        `SELECT "rolId", count(*)::int AS n FROM users WHERE "empresaId" = $1 GROUP BY "rolId"`,
        [empresaId],
      );

    return roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion ?? null,
      esSistema: r.esSistema,
      esCatalogo: r.empresa == null,
      usuarios: conteos.find((c) => c.rolId === r.id)?.n ?? 0,
      permisos: permisos
        .filter((p) => p.rol.id === r.id)
        .map((p) => this.resumen(p)),
    }));
  }

  // ───────────────────────── escritura ─────────────────────────

  async crear(empresaId: number, dto: GuardarRolDto) {
    await this.validarModulosOtorgables(empresaId, dto);
    await this.validarNombreLibre(empresaId, dto.nombre);

    return this.dataSource.transaction(async (m) => {
      const rol = await m.save(Rol, {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        empresa: { id: empresaId },
        esSistema: false,
        isActive: true,
      });
      const nuevos = this.prepararPermisos(dto, rol.id, empresaId);
      if (nuevos.length) await m.insert(PermisoModulo, nuevos);
      return {
        id: rol.id,
        nombre: rol.nombre,
        despues: nuevos.map(this.resumen),
      };
    });
  }

  async actualizar(
    rolId: number,
    empresaId: number,
    dto: GuardarRolDto,
    actor: AuthenticatedUser,
  ) {
    const rol = await this.obtenerVisible(rolId, empresaId);

    if (rol.esSistema) {
      throw new ConflictException(
        'El rol Administrador tiene acceso total y no se puede modificar.',
      );
    }
    const esCatalogo = rol.empresa == null;
    if (esCatalogo && dto.nombre !== rol.nombre) {
      throw new ConflictException('Un rol del catálogo no se puede renombrar.');
    }
    if (!esCatalogo && dto.nombre !== rol.nombre) {
      await this.validarNombreLibre(empresaId, dto.nombre, rolId);
    }

    await this.validarModulosOtorgables(empresaId, dto);
    const nuevos = this.prepararPermisos(dto, rolId, empresaId);

    // Mensaje claro para el caso puntual del autobloqueo
    const gestion = nuevos.find(
      (p) => p.modulo === ModuloAdministrativo.GESTION_ROLES,
    );
    if (actor.rolId === rolId && !actor.esSistema && !gestionaRoles(gestion)) {
      throw new ConflictException(
        'No podés quitarte el permiso de gestionar roles.',
      );
    }

    const antes = await this.permisoRepo.find({
      where: { empresaId, rol: { id: rolId } },
    });

    await this.dataSource.transaction(async (m) => {
      if (!esCatalogo) {
        await m.update(Rol, rolId, {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
        });
      }
      await this.borrarPermisos(m, rolId, empresaId);
      if (nuevos.length) await m.insert(PermisoModulo, nuevos);
      await this.exigirGestor(m, empresaId); // invariante: la empresa conserva un gestor
    });

    return {
      id: rolId,
      nombre: dto.nombre,
      antes: antes.map(this.resumen),
      despues: nuevos.map(this.resumen),
    };
  }

  async eliminar(rolId: number, empresaId: number) {
    const rol = await this.obtenerVisible(rolId, empresaId);

    if (rol.esSistema) {
      throw new ConflictException('No se puede eliminar el rol Administrador.');
    }
    if (rol.empresa == null) {
      throw new ConflictException(
        'Los roles del catálogo no se pueden eliminar.',
      );
    }

    const usuarios = await this.dataSource.getRepository(User).count({
      where: { rolId, empresa: { id: empresaId } },
    });
    if (usuarios > 0) {
      throw new ConflictException(
        `El rol tiene ${usuarios} usuario(s) asignado(s). Reasignalos antes de eliminarlo.`,
      );
    }

    const antes = await this.permisoRepo.find({
      where: { empresaId, rol: { id: rolId } },
    });
    await this.dataSource.transaction(async (m) => {
      await this.borrarPermisos(m, rolId, empresaId);
      await m.delete(Rol, rolId);
    });
    return { id: rolId, nombre: rol.nombre, antes: antes.map(this.resumen) };
  }

  async asignarRol(
    usuarioId: number,
    nuevoRolId: number,
    empresaId: number,
    actor: AuthenticatedUser,
  ) {
    const usuario = await this.dataSource.getRepository(User).findOne({
      where: { id: usuarioId, empresa: { id: empresaId } },
      relations: { rol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const nuevoRol = await this.obtenerAsignable(nuevoRolId, empresaId);

    // Un gestor de empresa no puede tocar a un usuario con rol de sistema (degradación del Administrador)
    if (usuario.rol?.esSistema && !actor.esSistema) {
      throw new ForbiddenException(
        'No podés asignar ni cambiar un rol de sistema.',
      );
    }

    // Autobloqueo: no asignarte un rol sin gestión de roles
    if (actor.id === usuarioId && !actor.esSistema && !nuevoRol.esSistema) {
      const perm = await this.permisoRepo.findOne({
        where: {
          empresaId,
          rol: { id: nuevoRolId },
          modulo: ModuloAdministrativo.GESTION_ROLES,
        },
      });
      if (!gestionaRoles(perm ?? undefined)) {
        throw new ConflictException(
          'No podés asignarte un rol sin gestión de roles.',
        );
      }
    }

    await this.dataSource.transaction(async (m) => {
      await m.update(User, usuarioId, { rolId: nuevoRolId });
      await this.exigirGestor(m, empresaId);
    });

    return {
      usuarioId,
      rolAnterior: usuario.rol?.nombre ?? null,
      rolNuevo: nuevoRol.nombre,
    };
  }

  /**
   * Rol que se le puede dar a un usuario de esta empresa: del catálogo o de la
   * propia empresa, activo, y nunca el de sistema (ni siquiera lo asigna el Administrador).
   */
  async obtenerAsignable(rolId: number, empresaId: number): Promise<Rol> {
    const rol = await this.obtenerVisible(rolId, empresaId);
    if (rol.esSistema) {
      throw new ForbiddenException(
        'El rol Administrador no se puede asignar a usuarios de empresa.',
      );
    }
    if (!rol.isActive) throw new ConflictException('El rol está inactivo.');
    return rol;
  }

  // ───────────────────────── helpers ─────────────────────────

  private resumen = (p: ResumenPermiso): ResumenPermiso => ({
    modulo: p.modulo,
    canRead: p.canRead,
    canCreate: p.canCreate,
    canUpdate: p.canUpdate,
    canDelete: p.canDelete,
    canExport: p.canExport,
  });

  private async obtenerVisible(rolId: number, empresaId: number): Promise<Rol> {
    const rol = await this.rolRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.empresa', 'e')
      .where('r.id = :rolId AND (e.id IS NULL OR e.id = :empresaId)', {
        rolId,
        empresaId,
      })
      .getOne();
    if (!rol) throw new NotFoundException('Rol no encontrado.');
    return rol;
  }

  private async validarNombreLibre(
    empresaId: number,
    nombre: string,
    excluirId?: number,
  ) {
    const qb = this.rolRepo
      .createQueryBuilder('r')
      .leftJoin('r.empresa', 'e')
      .where('LOWER(r.nombre) = LOWER(:nombre)', { nombre })
      .andWhere('(e.id IS NULL OR e.id = :empresaId)', { empresaId });
    if (excluirId) qb.andWhere('r.id <> :excluirId', { excluirId });
    if (await qb.getExists()) {
      throw new ConflictException('Ya existe un rol con ese nombre.');
    }
  }

  /** "Sin acceso" = sin fila. Fuerza ver cuando hay otra acción. Rechaza módulos repetidos. */
  private prepararPermisos(
    dto: GuardarRolDto,
    rolId: number,
    empresaId: number,
  ): PermisoAGuardar[] {
    const vistos = new Set<string>();
    const resultado: PermisoAGuardar[] = [];

    for (const p of dto.permisos) {
      if (vistos.has(p.modulo)) {
        throw new BadRequestException(`Módulo repetido: ${p.modulo}.`);
      }
      vistos.add(p.modulo);

      const f = normalizar(p);
      if (sinAcceso(f)) continue;

      resultado.push({
        modulo: p.modulo,
        canRead: f.canRead,
        canCreate: f.canCreate,
        canUpdate: f.canUpdate,
        canDelete: f.canDelete,
        canExport: f.canExport,
        canWrite: f.canCreate || f.canUpdate || f.canDelete,
        empresaId,
        rol: { id: rolId },
      });
    }
    return resultado;
  }

  private async borrarPermisos(
    m: EntityManager,
    rolId: number,
    empresaId: number,
  ) {
    await m
      .createQueryBuilder()
      .delete()
      .from(PermisoModulo)
      .where('"rolId" = :rolId AND "empresaId" = :empresaId', {
        rolId,
        empresaId,
      })
      .execute();
  }

  /**
   * Una empresa solo puede otorgar módulos que contrató más los módulos
   * administrativos otorgables. PLATAFORMA nunca es otorgable.
   */
  private async validarModulosOtorgables(
    empresaId: number,
    dto: GuardarRolDto,
  ) {
    const filas: { modulo: string }[] = await this.dataSource.query(
      `SELECT modulo::text AS modulo FROM empresa_modulos WHERE "empresaId" = $1`,
      [empresaId],
    );
    const permitidos = new Set<string>([
      ...filas.map((f) => f.modulo),
      ...MODULOS_ADMIN_OTORGABLES,
    ]);
    const invalidos = dto.permisos.filter(
      (p) => !sinAcceso(p) && !permitidos.has(p.modulo),
    );
    if (invalidos.length) {
      throw new ForbiddenException(
        `Módulos no contratados o no otorgables: ${invalidos
          .map((p) => p.modulo)
          .join(', ')}.`,
      );
    }
  }

  /** Invariante: tras cualquier cambio, la empresa conserva al menos un gestor activo. */
  private async exigirGestor(m: EntityManager, empresaId: number) {
    const [{ n }] = await m.query(
      `SELECT count(*)::int AS n
         FROM users u
         JOIN roles r ON r.id = u."rolId"
         LEFT JOIN permiso_modulos p
           ON p."rolId" = r.id AND p."empresaId" = u."empresaId"
          AND p.modulo = $2 AND p."canRead" AND p."canUpdate"
        WHERE u."empresaId" = $1 AND u."isActive" AND r."isActive"
          AND (r."esSistema" OR p.id IS NOT NULL)`,
      [empresaId, ModuloAdministrativo.GESTION_ROLES],
    );
    if (n === 0) {
      throw new ConflictException(
        'La operación dejaría a la empresa sin ningún usuario que pueda gestionar roles.',
      );
    }
  }
}