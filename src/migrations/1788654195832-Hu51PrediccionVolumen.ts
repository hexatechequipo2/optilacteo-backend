import { MigrationInterface, QueryRunner } from "typeorm";

export class Hu51PrediccionVolumen1788654195832 implements MigrationInterface {
    name = 'Hu51PrediccionVolumen1788654195832'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // HU-51: enum utilizado para representar la unidad física
        // de la cantidad ingresada de un lote.
        await queryRunner.query(`
            CREATE TYPE "lotes_unidad_cantidad_enum"
            AS ENUM ('litros', 'kilogramos')
        `);

        // HU-51: agregar la unidad de cantidad al lote.
        await queryRunner.query(`
            ALTER TABLE "lotes"
            ADD "unidad_cantidad" "lotes_unidad_cantidad_enum"
        `);

        // HU-51: tabla de predicciones de volumen.
        await queryRunner.query(`
            CREATE TABLE "predicciones_volumen" (
                "id" SERIAL PRIMARY KEY,
                "empresaId" INT NOT NULL,
                "tipo_materia_prima" "lotes_tipo_materia_prima_enum" NOT NULL,
                "unidad" "lotes_unidad_cantidad_enum" NOT NULL,
                "fecha_generacion" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "modelo_version" VARCHAR NOT NULL,
                "dias" JSONB NOT NULL,
                "status" VARCHAR NOT NULL DEFAULT 'ok',
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        // Relación con empresa.
        await queryRunner.query(`
            ALTER TABLE "predicciones_volumen"
            ADD CONSTRAINT "FK_predicciones_volumen_empresa"
            FOREIGN KEY ("empresaId")
            REFERENCES "empresas"("id")
            ON DELETE CASCADE
        `);

        // Índice para consultar predicciones por empresa,
        // materia prima y fecha de generación.
        await queryRunner.query(`
            CREATE INDEX "IDX_predicciones_volumen_empresa_materia_fecha"
            ON "predicciones_volumen"
            ("empresaId", "tipo_materia_prima", "fecha_generacion" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_predicciones_volumen_empresa_materia_fecha"
        `);

        await queryRunner.query(`
            ALTER TABLE "predicciones_volumen"
            DROP CONSTRAINT "FK_predicciones_volumen_empresa"
        `);

        await queryRunner.query(`
            DROP TABLE "predicciones_volumen"
        `);

        await queryRunner.query(`
            ALTER TABLE "lotes"
            DROP COLUMN "unidad_cantidad"
        `);

        await queryRunner.query(`
            DROP TYPE "lotes_unidad_cantidad_enum"
        `);
    }
}
