import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRevokedTokens1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "revoked_tokens" (
        "id" SERIAL NOT NULL,
        "token_hash" character varying NOT NULL,
        "user_id" integer NOT NULL,
        "tenant_id" character varying,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_revoked_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_revoked_tokens_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_revoked_tokens_active_lookup"
      ON "revoked_tokens" ("token_hash", "expires_at", "deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_revoked_tokens_active_lookup"`);
    await queryRunner.query(`DROP TABLE "revoked_tokens"`);
  }
}
