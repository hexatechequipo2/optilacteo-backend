import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndicesSensorLecturasHistorial1785099216816 implements MigrationInterface {
  name = 'AddIndicesSensorLecturasHistorial1785099216816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_sensor_lecturas_empresa_timestamp" ON "sensor_lecturas" ("empresaId", "timestampLectura")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sensor_lecturas_empresa_lote_timestamp" ON "sensor_lecturas" ("empresaId", "loteId", "timestampLectura")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_sensor_lecturas_empresa_lote_timestamp"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_sensor_lecturas_empresa_timestamp"`,
    );
  }
}
