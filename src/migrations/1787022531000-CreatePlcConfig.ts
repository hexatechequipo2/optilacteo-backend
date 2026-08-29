import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlcConfig1787022531000 implements MigrationInterface {
  name = 'CreatePlcConfig1787022531000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "plc_config" (
            "id" SERIAL NOT NULL,
            "empresa_id" integer NOT NULL,
            "url" character varying NOT NULL,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_plc_config_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_plc_config_empresa" UNIQUE ("empresa_id"),
            CONSTRAINT "FK_plc_config_empresa" FOREIGN KEY ("empresa_id")
            REFERENCES "empresas"("id") ON DELETE CASCADE
        )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plc_config"`);
  }
}
