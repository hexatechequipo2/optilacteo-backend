import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoteRevisionCalidad1785276086399 implements MigrationInterface {
  name = 'CreateLoteRevisionCalidad1785276086399';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."lote_revision_calidad_decision_enum" AS ENUM('aprobado', 'rechazado')
        `);

    await queryRunner.query(`
            CREATE TABLE "lote_revision_calidad" (
                "id" SERIAL PRIMARY KEY,
                "loteId" integer NOT NULL,
                "decision" "public"."lote_revision_calidad_decision_enum" NOT NULL,
                "justificacion" text NOT NULL,
                "usuarioId" integer NOT NULL,
                "empresaId" integer NOT NULL,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "FK_lrc_lote" FOREIGN KEY ("loteId")
                    REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_lrc_empresa" FOREIGN KEY ("empresaId")
                    REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_lrc_usuario" FOREIGN KEY ("usuarioId")
                    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_lrc_empresa" ON "lote_revision_calidad" ("empresaId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_lrc_empresa_lote_created"
            ON "lote_revision_calidad" ("empresaId", "loteId", "createdAt")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_lrc_empresa_lote_created"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_lrc_empresa"`);
    await queryRunner.query(`DROP TABLE "lote_revision_calidad"`);
    await queryRunner.query(
      `DROP TYPE "public"."lote_revision_calidad_decision_enum"`,
    );
  }
}
