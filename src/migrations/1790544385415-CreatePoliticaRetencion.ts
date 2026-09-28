import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePoliticaRetencion1790544385415 implements MigrationInterface {
    name = 'CreatePoliticaRetencion1790544385415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "politica_retencion" (
            "id" SERIAL NOT NULL,
            "empresa_id" integer NOT NULL,
            "retencion_meses" integer NOT NULL DEFAULT 24,
            "dias_aviso_vencimiento" integer NOT NULL DEFAULT 30,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_politica_retencion" PRIMARY KEY ("id")
        )
        `);

        await queryRunner.query(`
        ALTER TABLE "politica_retencion"
        ADD CONSTRAINT "UQ_politica_retencion_empresa_id" UNIQUE ("empresa_id")
        `);

        await queryRunner.query(`
        ALTER TABLE "politica_retencion"
        ADD CONSTRAINT "FK_politica_retencion_empresa" FOREIGN KEY ("empresa_id")
        REFERENCES "empresas"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "politica_retencion" DROP CONSTRAINT "FK_politica_retencion_empresa"`);
        await queryRunner.query(`ALTER TABLE "politica_retencion" DROP CONSTRAINT "UQ_politica_retencion_empresa_id"`);
        await queryRunner.query(`DROP TABLE "politica_retencion"`);
    }
}
