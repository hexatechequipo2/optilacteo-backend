import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemConfig1760000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "system_config" (
        "id" SERIAL NOT NULL,
        "inactivity_timeout" integer NOT NULL DEFAULT 30,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_config_id" PRIMARY KEY ("id")
      )
    `);

    //Insertar el registro inicial con valores por defecto
    await queryRunner.query(`
      INSERT INTO "system_config" ("inactivity_timeout") VALUES (30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system_config"`);
  }
}
