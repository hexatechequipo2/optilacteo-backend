import { MigrationInterface, QueryRunner } from 'typeorm';

// Requiere que, antes de correr esta migracion, no existan filas en
// "empresas" con cuit NULL o duplicado (ver diagnostico previo: la unica
// fila NULL en dev, id=1, se corrige a mano antes de migrar). No hace
// backfill de datos a proposito.
export class AddCuitUniqueConstraintToEmpresas1820000000000 implements MigrationInterface {
  name = 'AddCuitUniqueConstraintToEmpresas1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "empresas" ALTER COLUMN "cuit" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "empresas" ADD CONSTRAINT "UQ_empresas_cuit" UNIQUE ("cuit")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "empresas" DROP CONSTRAINT "UQ_empresas_cuit"
    `);

    await queryRunner.query(`
      ALTER TABLE "empresas" ALTER COLUMN "cuit" DROP NOT NULL
    `);
  }
}
