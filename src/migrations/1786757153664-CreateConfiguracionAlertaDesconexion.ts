import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateConfiguracionAlertaDesconexion1786757153664 implements MigrationInterface {
    name = 'CreateConfiguracionAlertaDesconexion1786757153664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "configuracion_alerta_desconexion" (
            "id" SERIAL PRIMARY KEY,
            "empresa_id" integer NOT NULL,
            "umbral_minutos" integer NOT NULL DEFAULT 15,
            "created_at" timestamptz NOT NULL DEFAULT now(),
            "updated_at" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_config_alerta_desconexion_empresa" UNIQUE ("empresa_id"),
            CONSTRAINT "FK_config_alerta_desconexion_empresa"
            FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE
        )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "configuracion_alerta_desconexion"`);
    }
}
