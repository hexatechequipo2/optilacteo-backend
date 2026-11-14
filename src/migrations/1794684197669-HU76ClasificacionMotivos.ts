import { MigrationInterface, QueryRunner } from "typeorm";

export class HU76ClasificacionMotivos1794684197669 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
        `ALTER TABLE "lotes" ADD COLUMN "clasificacionMotivos" jsonb`,
        );
        await queryRunner.query(
        `ALTER TABLE "lotes" ADD COLUMN "clasificacionManual" boolean NOT NULL DEFAULT false`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "clasificacionManual"`);
        await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "clasificacionMotivos"`);
    }

}
