import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertTimestampsToTimestamptz1800000000000
  implements MigrationInterface
{
  name = 'ConvertTimestampsToTimestamptz1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Los valores existentes son "naive" pero representan hora UTC real
    // (la app y Postgres corren en UTC), por eso se etiquetan con
    // AT TIME ZONE 'UTC' en vez de convertir el valor.
    await queryRunner.query(`
      ALTER TABLE "revoked_tokens"
        ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ USING "expires_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ USING "deleted_at" AT TIME ZONE 'UTC'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "lockedUntil" TYPE TIMESTAMPTZ USING "lockedUntil" AT TIME ZONE 'UTC'
    `);

    await queryRunner.query(`
      ALTER TABLE "proveedores"
        ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
    `);

    await queryRunner.query(`
      ALTER TABLE "system_config"
        ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "system_config"
        ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
    `);

    await queryRunner.query(`
      ALTER TABLE "proveedores"
        ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "lockedUntil" TYPE TIMESTAMP USING "lockedUntil" AT TIME ZONE 'UTC'
    `);

    await queryRunner.query(`
      ALTER TABLE "revoked_tokens"
        ALTER COLUMN "deleted_at" TYPE TIMESTAMP USING "deleted_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
        ALTER COLUMN "expires_at" TYPE TIMESTAMP USING "expires_at" AT TIME ZONE 'UTC'
    `);
  }
}
