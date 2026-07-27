import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMedicionesManualesLote1785188435195 implements MigrationInterface {
    name = 'CreateMedicionesManualesLote1785188435195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "mediciones_manuales_lote" (
                "id" SERIAL PRIMARY KEY,
                "loteId" integer NOT NULL,
                "tipo_materia_prima" "public"."configuracion_parametros_tipo_materia_prima_enum" NOT NULL,
                "parametro" "public"."configuracion_parametros_parametro_enum" NOT NULL,
                "valor" decimal(10,2) NOT NULL,
                "empresaId" integer NOT NULL,
                "usuarioId" integer NOT NULL,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "FK_mml_lote" FOREIGN KEY ("loteId")
                    REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_mml_empresa" FOREIGN KEY ("empresaId")
                    REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_mml_usuario" FOREIGN KEY ("usuarioId")
                    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_mml_empresa" ON "mediciones_manuales_lote" ("empresaId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_mml_empresa_lote_created"
            ON "mediciones_manuales_lote" ("empresaId", "loteId", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_mml_empresa_lote_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_mml_empresa"`);
        await queryRunner.query(`DROP TABLE "mediciones_manuales_lote"`);
    }
}