import { MigrationInterface, QueryRunner } from "typeorm";

export class PermisosGranulares1790892436783 implements MigrationInterface {
    name = 'PermisosGranulares1790892436783';

    public async up(q: QueryRunner): Promise<void> {
    // 1. Nuevas acciones
    await q.query(`
      ALTER TABLE "permiso_modulos"
        ADD COLUMN "canCreate" boolean NOT NULL DEFAULT false,
        ADD COLUMN "canUpdate" boolean NOT NULL DEFAULT false,
        ADD COLUMN "canDelete" boolean NOT NULL DEFAULT false,
        ADD COLUMN "canExport" boolean NOT NULL DEFAULT false
    `);

    // 2. Conservar el comportamiento actual (canExport en false a propósito)
    await q.query(`
      UPDATE "permiso_modulos"
      SET "canCreate" = "canWrite", "canUpdate" = "canWrite", "canDelete" = "canWrite"
    `);

    // 3. Rol de sistema
    await q.query(`ALTER TABLE "roles" ADD COLUMN "esSistema" boolean NOT NULL DEFAULT false`);
    await q.query(`
      UPDATE "roles" SET "esSistema" = true
      WHERE "id" = 1 AND "empresaId" IS NULL AND "nombre" = 'Administrador'
    `);

    // 4. Tipo propio para permiso_modulos.modulo (desacoplado de empresa_modulos)
    await q.query(`
      CREATE TYPE "permiso_modulos_modulo_enum" AS ENUM (
        'dashboard','recepcion','destino_productivo_ia','monitoreo_alertas',
        'sensores_iot','trazabilidad','reportes_forecast','asistente_voz','gestion_roles'
      )
    `);
    await q.query(`
      ALTER TABLE "permiso_modulos"
        ALTER COLUMN "modulo" TYPE "permiso_modulos_modulo_enum"
        USING "modulo"::text::"permiso_modulos_modulo_enum"
    `);

    // 5. Un permiso por (empresa, rol, módulo)
    await q.query(`
      CREATE UNIQUE INDEX "UQ_permiso_empresa_rol_modulo"
      ON "permiso_modulos" ("empresaId", "rolId", "modulo")
    `);

    // 6. El Gerente de cada empresa existente gestiona roles
    await q.query(`
      INSERT INTO "permiso_modulos"
        ("modulo","canRead","canWrite","canCreate","canUpdate","canDelete","canExport","rolId","empresaId")
      SELECT 'gestion_roles', true, true, true, true, true, false, r."id", e."id"
      FROM "empresas" e
      CROSS JOIN "roles" r
      WHERE r."nombre" = 'Gerente' AND r."empresaId" IS NULL
      ON CONFLICT ("empresaId","rolId","modulo") DO NOTHING
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "UQ_permiso_empresa_rol_modulo"`);
    await q.query(`DELETE FROM "permiso_modulos" WHERE "modulo" = 'gestion_roles'`);
    await q.query(`
      ALTER TABLE "permiso_modulos"
        ALTER COLUMN "modulo" TYPE "empresa_modulos_modulo_enum"
        USING "modulo"::text::"empresa_modulos_modulo_enum"
    `);
    await q.query(`DROP TYPE "permiso_modulos_modulo_enum"`);
    await q.query(`ALTER TABLE "roles" DROP COLUMN "esSistema"`);
    await q.query(`
      ALTER TABLE "permiso_modulos"
        DROP COLUMN "canCreate", DROP COLUMN "canUpdate",
        DROP COLUMN "canDelete", DROP COLUMN "canExport"
    `);
  }

}
