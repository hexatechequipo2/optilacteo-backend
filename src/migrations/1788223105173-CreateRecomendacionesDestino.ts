import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRecomendacionesDestino1788223105173 implements MigrationInterface {
  name = 'CreateRecomendacionesDestino1788223105173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "recomendaciones_destino_destinorecomendado_enum" AS ENUM (
        'produccion',
        'almacenamiento',
        'tratamiento',
        'descarte'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "recomendaciones_destino_destinoreal_enum" AS ENUM (
        'produccion',
        'almacenamiento',
        'tratamiento',
        'descarte'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recomendaciones_destino" (
        "id" SERIAL NOT NULL,
        "loteId" integer NOT NULL,
        "empresaId" integer NOT NULL,
        "destinoRecomendado" "recomendaciones_destino_destinorecomendado_enum" NOT NULL,
        "confianza" double precision NOT NULL,
        "estado" varchar NOT NULL DEFAULT 'pendiente',
        "destinoReal" "recomendaciones_destino_destinoreal_enum",
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recomendaciones_destino_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD CONSTRAINT "FK_recomendaciones_destino_lote"
      FOREIGN KEY ("loteId") REFERENCES "lotes"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD CONSTRAINT "FK_recomendaciones_destino_empresa"
      FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recomendaciones_destino_loteId"
      ON "recomendaciones_destino" ("loteId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recomendaciones_destino_empresaId"
      ON "recomendaciones_destino" ("empresaId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_recomendaciones_destino_empresaId"`);
    await queryRunner.query(`DROP INDEX "IDX_recomendaciones_destino_loteId"`);

    await queryRunner.query(`ALTER TABLE "recomendaciones_destino" DROP CONSTRAINT "FK_recomendaciones_destino_empresa"`);
    await queryRunner.query(`ALTER TABLE "recomendaciones_destino" DROP CONSTRAINT "FK_recomendaciones_destino_lote"`);

    await queryRunner.query(`DROP TABLE "recomendaciones_destino"`);

    await queryRunner.query(`DROP TYPE "recomendaciones_destino_destinoreal_enum"`);
    await queryRunner.query(`DROP TYPE "recomendaciones_destino_destinorecomendado_enum"`);
  }
}
