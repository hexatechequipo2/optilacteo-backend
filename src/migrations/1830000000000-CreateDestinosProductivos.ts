import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDestinosProductivos1830000000000 implements MigrationInterface {
  name = 'CreateDestinosProductivos1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "destinos_productivos" (
        "id" SERIAL NOT NULL,
        "empresaId" integer NOT NULL,
        "nombre" character varying NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_destinos_productivos_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_destinos_productivos_empresaId_nombre" UNIQUE ("empresaId", "nombre")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "destinos_productivos"
      ADD CONSTRAINT "FK_destinos_productivos_empresa"
      FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_destinos_productivos_empresaId"
      ON "destinos_productivos" ("empresaId")
    `);

    await queryRunner.query(`
      ALTER TABLE "lotes"
      ADD COLUMN "destinoProductivoId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "lotes"
      ADD CONSTRAINT "FK_lotes_destinoProductivo"
      FOREIGN KEY ("destinoProductivoId") REFERENCES "destinos_productivos"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lotes" DROP CONSTRAINT "FK_lotes_destinoProductivo"
    `);
    await queryRunner.query(`
      ALTER TABLE "lotes" DROP COLUMN "destinoProductivoId"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_destinos_productivos_empresaId"
    `);
    await queryRunner.query(`
      ALTER TABLE "destinos_productivos" DROP CONSTRAINT "FK_destinos_productivos_empresa"
    `);
    await queryRunner.query(`
      DROP TABLE "destinos_productivos"
    `);
  }
}
