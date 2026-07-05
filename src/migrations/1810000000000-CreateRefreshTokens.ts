import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1810000000000 implements MigrationInterface {
  name = 'CreateRefreshTokens1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" SERIAL NOT NULL,
        "token_hash" character varying NOT NULL,
        "user_id" integer NOT NULL,
        "empresa_id" integer,
        "family_id" uuid NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "revoked_at" TIMESTAMPTZ,
        "replaced_by_hash" character varying,
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_family_id"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
