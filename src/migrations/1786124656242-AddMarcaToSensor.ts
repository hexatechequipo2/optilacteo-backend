import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarcaToSensor1786124656242 implements MigrationInterface {
  name = 'AddMarcaToSensor1786124656242';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sensores" ADD COLUMN "marca" character varying`,
    );
    await queryRunner.query(
      `UPDATE "sensores" SET "marca" = 'Sin especificar' WHERE "marca" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sensores" ALTER COLUMN "marca" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sensores" DROP COLUMN "marca"`);
  }
}
