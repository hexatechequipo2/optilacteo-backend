import { MigrationInterface, QueryRunner } from "typeorm";

export class AddValoresComprometidosLote1786936565941 implements MigrationInterface {
    name = 'AddValoresComprometidosLote1786936565941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "lotes"
        ADD COLUMN "cantidadComprometidaKg" numeric(10,2) NULL
        `);
        await queryRunner.query(`
        ALTER TABLE "lote_parametros"
        ADD COLUMN "valorComprometido" numeric(10,2) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lote_parametros" DROP COLUMN "valorComprometido"`);
        await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "cantidadComprometidaKg"`);
    }

}
