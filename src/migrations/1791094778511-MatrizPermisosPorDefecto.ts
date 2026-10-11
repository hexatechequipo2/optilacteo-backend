import { MigrationInterface, QueryRunner } from 'typeorm';

// Copia literal de MATRIZ_PERMISOS_POR_DEFECTO (permiso/constants) al momento
// de esta migración. No se importa a propósito: una migración no debe cambiar
// si cambia el código. Módulo ausente = sin acceso (sin fila).
// (rol, modulo, canRead, canCreate, canUpdate, canDelete, canExport)
const MATRIZ = `
  ('Gerente', 'dashboard',             true,  false, false, false, true),
  ('Gerente', 'recepcion',             true,  true,  true,  true,  true),
  ('Gerente', 'destino_productivo_ia', true,  true,  false, false, true),
  ('Gerente', 'monitoreo_alertas',     true,  false, true,  false, true),
  ('Gerente', 'sensores_iot',          true,  true,  true,  true,  true),
  ('Gerente', 'trazabilidad',          true,  true,  true,  true,  true),
  ('Gerente', 'reportes_forecast',     true,  false, false, false, true),
  ('Gerente', 'asistente_voz',         true,  false, false, false, true),
  ('Gerente', 'configuracion_empresa', true,  true,  true,  true,  false),
  ('Gerente', 'gestion_roles',         true,  true,  true,  true,  false),
  ('Gerente', 'gestion_usuarios',      true,  true,  true,  false, false),
  ('Gerente', 'auditoria',             true,  false, false, false, true),

  ('Operario de línea', 'dashboard',             true, false, false, false, true),
  ('Operario de línea', 'recepcion',             true, false, false, false, true),
  ('Operario de línea', 'destino_productivo_ia', true, false, false, false, true),
  ('Operario de línea', 'monitoreo_alertas',     true, true,  false, false, true),
  ('Operario de línea', 'sensores_iot',          true, false, true,  false, true),
  ('Operario de línea', 'trazabilidad',          true, false, false, false, true),
  ('Operario de línea', 'reportes_forecast',     true, false, false, false, true),
  ('Operario de línea', 'asistente_voz',         true, false, false, false, true),

  ('Responsable de producción', 'dashboard',             true, false, false, false, true),
  ('Responsable de producción', 'recepcion',             true, false, false, false, true),
  ('Responsable de producción', 'destino_productivo_ia', true, true,  false, false, true),
  ('Responsable de producción', 'monitoreo_alertas',     true, false, true,  false, true),
  ('Responsable de producción', 'sensores_iot',          true, true,  true,  true,  true),
  ('Responsable de producción', 'trazabilidad',          true, true,  true,  false, true),
  ('Responsable de producción', 'reportes_forecast',     true, false, false, false, true),
  ('Responsable de producción', 'asistente_voz',         true, false, false, false, true),
  ('Responsable de producción', 'configuracion_empresa', true, false, false, false, false),

  ('Responsable de calidad', 'dashboard',             true, false, false, false, true),
  ('Responsable de calidad', 'recepcion',             true, true,  false, false, true),
  ('Responsable de calidad', 'destino_productivo_ia', true, false, false, false, true),
  ('Responsable de calidad', 'monitoreo_alertas',     true, false, false, false, true),
  ('Responsable de calidad', 'sensores_iot',          true, false, false, false, true),
  ('Responsable de calidad', 'trazabilidad',          true, true,  true,  false, true),
  ('Responsable de calidad', 'reportes_forecast',     true, false, false, false, true),
  ('Responsable de calidad', 'asistente_voz',         true, false, false, false, true),
  ('Responsable de calidad', 'configuracion_empresa', true, false, false, false, false),
  ('Responsable de calidad', 'gestion_usuarios',      true, false, false, false, false)
`;

const ROLES_CATALOGO = `('Gerente'), ('Operario de línea'), ('Responsable de producción'), ('Responsable de calidad')`;

const FILAS_CATALOGO = `
  FROM "permiso_modulos" p
  JOIN "roles" r ON r."id" = p."rolId"
  WHERE r."empresaId" IS NULL
    AND r."nombre" IN (SELECT n FROM (VALUES ${ROLES_CATALOGO}) AS c(n))
`;

/**
 * HU-72: sin @Roles, permiso_modulos es la única fuente de verdad. Fija en
 * todas las empresas la matriz aprobada para los 4 roles de catálogo
 * (reemplaza sus filas). No toca roles personalizados ni al Administrador.
 *
 * down() no restaura lo anterior (no se guarda respaldo para no dejar tablas
 * sueltas): deja a los roles de catálogo sin filas, es decir sin acceso hasta
 * que el Gerente los configure desde /roles.
 */
export class MatrizPermisosPorDefecto1791094778511 implements MigrationInterface {
  name = 'MatrizPermisosPorDefecto1791094778511';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM "permiso_modulos" WHERE "id" IN (SELECT p."id" ${FILAS_CATALOGO})`,
    );

    await q.query(`
      INSERT INTO "permiso_modulos"
        ("modulo","canRead","canWrite","canCreate","canUpdate","canDelete","canExport","rolId","empresaId")
      SELECT d.modulo::"permiso_modulos_modulo_enum", d.r, (d.c OR d.u OR d.d), d.c, d.u, d.d, d.e, r."id", e."id"
      FROM (VALUES ${MATRIZ}) AS d(rol, modulo, r, c, u, d, e)
      JOIN "roles" r ON r."nombre" = d.rol AND r."empresaId" IS NULL
      CROSS JOIN "empresas" e
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM "permiso_modulos" WHERE "id" IN (SELECT p."id" ${FILAS_CATALOGO})`,
    );
  }
}
