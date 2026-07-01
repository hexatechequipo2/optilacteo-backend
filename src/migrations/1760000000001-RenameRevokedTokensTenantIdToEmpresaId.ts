import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRevokedTokensTenantIdToEmpresaId1760000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Renombrar columna tenant_id a empresa_id y cambiar tipo a integer
    await queryRunner.query(`
      ALTER TABLE "revoked_tokens"
      RENAME COLUMN "tenant_id" TO "empresa_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "revoked_tokens"
      ALTER COLUMN "empresa_id" TYPE integer USING NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "revoked_tokens"
      ALTER COLUMN "empresa_id" TYPE character varying USING NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "revoked_tokens"
      RENAME COLUMN "empresa_id" TO "tenant_id"
    `);
  }
}