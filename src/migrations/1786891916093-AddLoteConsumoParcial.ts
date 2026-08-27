import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoteConsumoParcial1786891916093 implements MigrationInterface {
    name = 'AddLoteConsumoParcial1786891916093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- lotes: cantidad total y saldo remanente ---
        // Nullable a propósito: lotes existentes (pre-HU-68) no tienen cantidad
        // cargada. El service valida esto antes de permitir un consumo.
        await queryRunner.query(`
            ALTER TABLE "lotes"
            ADD COLUMN "cantidad" numeric(10,2) NULL,
            ADD COLUMN "cantidadDisponible" numeric(10,2) NULL
        `);

        // --- lote_produccion ---
        await queryRunner.query(`
            CREATE TABLE "lote_produccion" (
                "id" SERIAL PRIMARY KEY,
                "empresaId" integer NOT NULL,
                "codigo" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_lote_produccion_codigo_empresa" UNIQUE ("codigo", "empresaId"),
                CONSTRAINT "FK_lote_produccion_empresa" FOREIGN KEY ("empresaId")
                    REFERENCES "empresas"("id") ON DELETE CASCADE
            )
        `);

        // --- lote_consumo (append-only) ---
        await queryRunner.query(`
            CREATE TABLE "lote_consumo" (
                "id" SERIAL PRIMARY KEY,
                "loteIngresoId" integer NOT NULL,
                "loteProduccionId" integer NOT NULL,
                "cantidad" numeric(10,2) NOT NULL,
                "empresaId" integer NOT NULL,
                "usuarioId" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_lote_consumo_lote_ingreso" FOREIGN KEY ("loteIngresoId")
                    REFERENCES "lotes"("id") ON DELETE RESTRICT,
                CONSTRAINT "FK_lote_consumo_lote_produccion" FOREIGN KEY ("loteProduccionId")
                    REFERENCES "lote_produccion"("id") ON DELETE RESTRICT,
                CONSTRAINT "FK_lote_consumo_empresa" FOREIGN KEY ("empresaId")
                    REFERENCES "empresas"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_lote_consumo_usuario" FOREIGN KEY ("usuarioId")
                    REFERENCES "users"("id") ON DELETE RESTRICT
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_lote_consumo_lote_ingreso" ON "lote_consumo" ("loteIngresoId")
        `);

        // --- lote_consumo_parametro (parámetros de calidad del remanente) ---
        await queryRunner.query(`
            CREATE TABLE "lote_consumo_parametro" (
                "id" SERIAL PRIMARY KEY,
                "loteConsumoId" integer NOT NULL,
                "parametro" character varying NOT NULL,
                "valor" numeric(10,2) NOT NULL,
                CONSTRAINT "FK_lote_consumo_parametro_consumo" FOREIGN KEY ("loteConsumoId")
                    REFERENCES "lote_consumo"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "lote_consumo_parametro"`);
        await queryRunner.query(`DROP INDEX "IDX_lote_consumo_lote_ingreso"`);
        await queryRunner.query(`DROP TABLE "lote_consumo"`);
        await queryRunner.query(`DROP TABLE "lote_produccion"`);
        await queryRunner.query(`
            ALTER TABLE "lotes"
            DROP COLUMN "cantidadDisponible",
            DROP COLUMN "cantidad"
        `);
    }
}