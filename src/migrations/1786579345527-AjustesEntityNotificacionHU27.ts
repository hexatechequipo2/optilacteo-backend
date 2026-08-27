import { MigrationInterface, QueryRunner } from "typeorm";

export class AjustesEntityNotificacionHU271786579345527 implements MigrationInterface {
    name = 'AjustesEntityNotificacionHU271786579345527'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. FK de lote_id -> lotes.id
        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ADD CONSTRAINT "FK_notificaciones_lote_id"
            FOREIGN KEY ("lote_id") REFERENCES "lotes"("id")
            ON DELETE SET NULL
        `);

        // 2. Cambio de tipo de "parametro": varchar -> enum
        //    ⚠️ AJUSTAR esta lista a los valores reales de Parametro
        await queryRunner.query(`
            CREATE TYPE "public"."notificaciones_parametro_enum" AS ENUM(
                'ph', 'temperatura', 'acidez', 'densidad'
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ALTER COLUMN "parametro" TYPE "public"."notificaciones_parametro_enum"
            USING "parametro"::"public"."notificaciones_parametro_enum"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            ALTER COLUMN "parametro" TYPE character varying
            USING "parametro"::character varying
        `);

        await queryRunner.query(`
            DROP TYPE "public"."notificaciones_parametro_enum"
        `);

        await queryRunner.query(`
            ALTER TABLE "notificaciones"
            DROP CONSTRAINT "FK_notificaciones_lote_id"
        `);
    }
}
