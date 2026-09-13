import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateConfiguracionSilencioAlerta1789254436656 implements MigrationInterface {
    name = 'CreateConfiguracionSilencioAlerta1789254436656'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "configuracion_silencio_alerta" (
            "id" SERIAL NOT NULL,
            "empresa_id" integer NOT NULL,
            "nombre" character varying,
            "hora_inicio" time NOT NULL,
            "hora_fin" time NOT NULL,
            "dias_semana" integer[],
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_configuracion_silencio_alerta" PRIMARY KEY ("id")
        )
        `);

        await queryRunner.query(`
        CREATE INDEX "IDX_configuracion_silencio_alerta_empresa"
        ON "configuracion_silencio_alerta" ("empresa_id")
        `);

        await queryRunner.query(`
        ALTER TABLE "configuracion_silencio_alerta"
        ADD CONSTRAINT "FK_configuracion_silencio_alerta_empresa"
        FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
        ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "configuracion_silencio_alerta"
        DROP CONSTRAINT "FK_configuracion_silencio_alerta_empresa"
        `);

        await queryRunner.query(`
        DROP INDEX "IDX_configuracion_silencio_alerta_empresa"
        `);

        await queryRunner.query(`
        DROP TABLE "configuracion_silencio_alerta"
        `);
    }

}
