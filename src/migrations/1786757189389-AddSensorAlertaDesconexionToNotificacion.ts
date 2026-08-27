import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSensorAlertaDesconexionToNotificacion1786757189389 implements MigrationInterface {
    name = 'AddSensorAlertaDesconexionToNotificacion1786757189389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "notificaciones" ADD COLUMN "sensor_id" integer NULL
        `);
        await queryRunner.query(`
        ALTER TABLE "notificaciones"
        ADD CONSTRAINT "FK_notificaciones_sensor"
        FOREIGN KEY ("sensor_id") REFERENCES "sensores"("id") ON DELETE SET NULL
        `);
        await queryRunner.query(`
        ALTER TYPE "notificaciones_tipo_enum" ADD VALUE 'alerta_sensor_desconectado'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notificaciones" DROP CONSTRAINT "FK_notificaciones_sensor"`);
        await queryRunner.query(`ALTER TABLE "notificaciones" DROP COLUMN "sensor_id"`);
    }

}
