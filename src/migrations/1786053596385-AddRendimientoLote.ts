import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRendimientoLote1786053596385 implements MigrationInterface {
  name = 'AddRendimientoLote1786053596385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lotes" ADD "rendimiento" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "rendimiento"`);
  }
}
