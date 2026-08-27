import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCamposAlertaNotificacion1786577926535 implements MigrationInterface {
    name = 'AddCamposAlertaNotificacion1786577926535'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Nuevo tipo enum para el estado de la alerta (HU-27)
        await queryRunner.query(`
            CREATE TYPE "public"."notificaciones_estado_enum" AS ENUM('abierta', 'cerrada')
        `);

        // 2. Nuevas columnas
        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD "lote_id" integer
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD "parametro" character varying
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD "estado" "public"."notificaciones_estado_enum"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD "accion_correctiva" text
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD "resuelta_por_id" integer
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD "fecha_resolucion" TIMESTAMP WITH TIME ZONE
        `);

        // 3. Índice compuesto para el lookup de alertas abiertas por lote+parámetro
        await queryRunner.query(`
            CREATE INDEX "IDX_notificaciones_empresa_lote_parametro_estado"
            ON "notificaciones" ("empresaId", "lote_id", "parametro", "estado")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_notificaciones_empresa_lote_parametro_estado"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones" DROP COLUMN "fecha_resolucion"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones" DROP COLUMN "resuelta_por_id"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones" DROP COLUMN "accion_correctiva"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones" DROP COLUMN "estado"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones" DROP COLUMN "parametro"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones" DROP COLUMN "lote_id"
        `);

        await queryRunner.query(`
            DROP TYPE "public"."notificaciones_estado_enum"
        `);
    }
}