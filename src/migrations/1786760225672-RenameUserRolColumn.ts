import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserRolColumn1786760225672 implements MigrationInterface {
  name = 'RenameUserRolColumn1786760225672';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Renombrar la columna "rol" a "rolId"
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "rol" TO "rolId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir el cambio
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "rolId" TO "rol"`,
    );
  }
}
