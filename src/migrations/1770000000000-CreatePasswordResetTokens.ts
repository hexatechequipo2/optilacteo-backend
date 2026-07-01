import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1770000000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id"         UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "token"      UUID              NOT NULL,
        "user_id"    INTEGER           NOT NULL,
        "tenant_id"  VARCHAR           NOT NULL,
        "expires_at" TIMESTAMPTZ       NOT NULL,
        "used"       BOOLEAN           NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens"      PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_password_reset_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_password_reset_tokens_token" ON "password_reset_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_password_reset_tokens_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_password_reset_tokens_token"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}