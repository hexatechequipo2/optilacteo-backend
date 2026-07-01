import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullableTenantIdOnPasswordResetTokens1790000000000
  implements MigrationInterface
{
  name = 'AllowNullableTenantIdOnPasswordResetTokens1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Los usuarios admin no tienen empresa asociada, por lo que tenant_id
    // debe poder ser NULL al solicitar un reset de contraseña.
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
      ALTER COLUMN "tenant_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);
  }
}
