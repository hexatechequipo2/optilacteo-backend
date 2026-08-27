import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUmbralDesconexionToSensor1786757115463 implements MigrationInterface {
    name = 'AddUmbralDesconexionToSensor1786757115463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "sensores" ADD COLUMN "umbral_desconexion_minutos" integer NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "sensores" DROP COLUMN "umbral_desconexion_minutos"
        `);
    }

}
