import { MigrationInterface, QueryRunner } from 'typeorm';

// Mismo set que PERMISOS_ADMIN_POR_DEFECTO (permiso.service.ts) para empresas
// nuevas. Se copia acá a propósito: una migración no debe cambiar si cambia el código.
// (rol, modulo, canRead, canWrite, canCreate, canUpdate, canDelete, canExport)
const DEFAULTS = `
  ('Gerente',                'gestion_usuarios',      true, true,  true,  true,  false, false),
  ('Gerente',                'configuracion_empresa', true, true,  false, true,  false, false),
  ('Responsable de calidad', 'gestion_usuarios',      true, false, false, false, false, false)
`;

/**
 * HU-72: /user, identidad y logo dejaron de usar @Roles. Para que nadie pierda
 * el acceso que tenía, cada empresa existente recibe:
 *  - Gerente: gestion_usuarios (R/C/U) y configuracion_empresa (R/U).
 *  - Responsable de calidad: gestion_usuarios (R), por el GET /user que tenía.
 */
export class BackfillPermisosAdministrativos1791091175766 implements MigrationInterface {
  name = 'BackfillPermisosAdministrativos1791091175766';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      INSERT INTO "permiso_modulos"
        ("modulo","canRead","canWrite","canCreate","canUpdate","canDelete","canExport","rolId","empresaId")
      SELECT d.modulo::"permiso_modulos_modulo_enum", d.r, d.w, d.c, d.u, d.d, d.e, r."id", e."id"
      FROM (VALUES ${DEFAULTS}) AS d(rol, modulo, r, w, c, u, d, e)
      JOIN "roles" r ON r."nombre" = d.rol AND r."empresaId" IS NULL
      CROSS JOIN "empresas" e
      ON CONFLICT ("empresaId","rolId","modulo") DO NOTHING
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM "permiso_modulos" p
      USING (VALUES ${DEFAULTS}) AS d(rol, modulo, r, w, c, u, d, e), "roles" r
      WHERE r."nombre" = d.rol AND r."empresaId" IS NULL
        AND p."rolId" = r."id" AND p."modulo"::text = d.modulo
    `);
  }
}
