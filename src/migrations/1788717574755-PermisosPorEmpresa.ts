import { MigrationInterface, QueryRunner } from "typeorm";

export class PermisosPorEmpresa1788717574755 implements MigrationInterface {
    name = 'PermisosPorEmpresa1788717574755'

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permiso_modulos" ADD COLUMN "empresaId" INT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "permiso_modulos" (modulo, "canRead", "canWrite", "rolId", "empresaId")
      SELECT modulo, "canRead", "canWrite", "rolId", e.id
      FROM "permiso_modulos" pm
      CROSS JOIN "empresas" e
      WHERE pm."empresaId" IS NULL
    `);

    await queryRunner.query(`
      DELETE FROM "permiso_modulos" WHERE "empresaId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "permiso_modulos" ALTER COLUMN "empresaId" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "permiso_modulos"
        ADD CONSTRAINT "FK_permiso_modulos_empresa"
        FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "permiso_modulos"
        ADD CONSTRAINT "UQ_permiso_modulos_empresa_rol_modulo"
        UNIQUE ("empresaId", "rolId", "modulo")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_permiso_modulos_empresa_rol"
      ON "permiso_modulos" ("empresaId", "rolId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_permiso_modulos_empresa_rol"`);
    await queryRunner.query(`
      ALTER TABLE "permiso_modulos" DROP CONSTRAINT "UQ_permiso_modulos_empresa_rol_modulo"
    `);
    await queryRunner.query(`
      ALTER TABLE "permiso_modulos" DROP CONSTRAINT "FK_permiso_modulos_empresa"
    `);
    await queryRunner.query(`
      DELETE FROM "permiso_modulos" pm
      WHERE pm.id NOT IN (
        SELECT MIN(id) FROM "permiso_modulos" GROUP BY "rolId", modulo
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "permiso_modulos" DROP COLUMN "empresaId"
    `);
  }

}
