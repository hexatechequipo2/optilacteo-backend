import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNumeroRemitoToLote1789089287897 implements MigrationInterface {
    name = 'AddNumeroRemitoToLote1789089287897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
        `ALTER TABLE "lotes" ADD COLUMN "numeroRemito" varchar`,
        );
        await queryRunner.query(
        `UPDATE "lotes" SET "numeroRemito" = 'S/D' WHERE "numeroRemito" IS NULL`,
        );
        await queryRunner.query(
        `ALTER TABLE "lotes" ALTER COLUMN "numeroRemito" SET NOT NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "numeroRemito"`);
    }
}
