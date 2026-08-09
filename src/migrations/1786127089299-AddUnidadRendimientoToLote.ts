import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnidadRendimientoToLote1786127089299 implements MigrationInterface {
  name = 'AddUnidadRendimientoToLote1786127089299';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "lotes_unidadrendimiento_enum" AS ENUM ('litros', 'kilogramos', 'porcentaje')
        `);
    await queryRunner.query(`
        ALTER TABLE "lotes" ADD "unidadRendimiento" "lotes_unidadrendimiento_enum"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lotes" DROP COLUMN "unidadRendimiento"`,
    );
    await queryRunner.query(`DROP TYPE "lotes_unidadrendimiento_enum"`);
  }
}
