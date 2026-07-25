import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrigenLecturaSensorLecturas1753400000000
  implements MigrationInterface
{
  name = 'AddOrigenLecturaSensorLecturas1753400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "sensor_lecturas_origen_enum" AS ENUM ('sensor', 'manual')
    `);

    await queryRunner.query(`
      ALTER TABLE "sensor_lecturas"
      ADD COLUMN "origen" "sensor_lecturas_origen_enum" NOT NULL DEFAULT 'sensor'
    `);

    await queryRunner.query(`
      ALTER TABLE "sensor_lecturas"
      ADD COLUMN "usuarioId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "sensor_lecturas"
      ADD CONSTRAINT "FK_sensor_lecturas_usuarioId"
      FOREIGN KEY ("usuarioId") REFERENCES "users"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sensor_lecturas" DROP CONSTRAINT "FK_sensor_lecturas_usuarioId"
    `);
    await queryRunner.query(`
      ALTER TABLE "sensor_lecturas" DROP COLUMN "usuarioId"
    `);
    await queryRunner.query(`
      ALTER TABLE "sensor_lecturas" DROP COLUMN "origen"
    `);
    await queryRunner.query(`
      DROP TYPE "sensor_lecturas_origen_enum"
    `);
  }
}