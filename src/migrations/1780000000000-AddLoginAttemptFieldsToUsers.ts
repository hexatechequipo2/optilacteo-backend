import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginAttemptFieldsToUsers1780000000000 implements MigrationInterface {
  name = 'AddLoginAttemptFieldsToUsers1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN "lockedUntil" TIMESTAMP DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "lockedUntil",
        DROP COLUMN "failedLoginAttempts"
    `);
  }
}
