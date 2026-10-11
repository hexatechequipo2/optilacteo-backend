import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescripcionTipoUsuarioToAuditLog1790458882417 implements MigrationInterface {
    name = 'AddDescripcionTipoUsuarioToAuditLog1790458882417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "audit_log"
        ADD COLUMN "userNombre" character varying,
        ADD COLUMN "userRol" character varying,
        ADD COLUMN "descripcion" text,
        ADD COLUMN "tipo" character varying NOT NULL DEFAULT 'OTRO'
        `);

        await queryRunner.query(`
        CREATE INDEX "IDX_audit_log_tipo" ON "audit_log" ("tipo")
        `);

        await queryRunner.query(`
        ALTER TABLE "audit_log" ALTER COLUMN "tipo" DROP DEFAULT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_audit_log_tipo"`);
        await queryRunner.query(`
        ALTER TABLE "audit_log"
        DROP COLUMN "userNombre",
        DROP COLUMN "userRol",
        DROP COLUMN "descripcion",
        DROP COLUMN "tipo"
        `);
    }

}
