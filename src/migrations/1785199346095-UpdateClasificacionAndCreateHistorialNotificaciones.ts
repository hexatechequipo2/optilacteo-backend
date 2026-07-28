import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateClasificacionAndCreateHistorialNotificaciones1785199346095 implements MigrationInterface {
    name = 'UpdateClasificacionAndCreateHistorialNotificaciones1785199346095'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear nuevo enum unificado
        await queryRunner.query(`
          CREATE TYPE "clasificacion_lote_enum" AS ENUM (
            'apto',
            'no_apto',
            'en_revision'
          )
        `);

        // 2. Convertir columna a texto para poder mapear valores viejos
        await queryRunner.query(`
          ALTER TABLE "lotes"
          ALTER COLUMN "clasificacion" TYPE text
        `);

        // 3. Normalizar valores existentes
        await queryRunner.query(`
          UPDATE "lotes"
          SET "clasificacion" = CASE
            WHEN clasificacion = 'primera' THEN 'apto'
            WHEN clasificacion = 'segunda' THEN 'en_revision'
            WHEN clasificacion = 'tercera' THEN 'en_revision'
            WHEN clasificacion = 'rechazado' THEN 'no_apto'
            ELSE clasificacion
          END
        `);

        // 4. Alterar columna para usar el nuevo enum
        await queryRunner.query(`
          ALTER TABLE "lotes"
          ALTER COLUMN "clasificacion" TYPE "clasificacion_lote_enum"
          USING clasificacion::"clasificacion_lote_enum"
        `);

        // 5. Borrar tipos viejos si existen
        await queryRunner.query(`DROP TYPE IF EXISTS "lotes_clasificacion_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "lote_clasificacion_historial_clasificacion_enum"`);

        // 6. Crear tabla historial usando el mismo enum
        await queryRunner.query(`
          CREATE TABLE "lote_clasificacion_historial" (
            "id" SERIAL PRIMARY KEY,
            "loteId" integer NOT NULL,
            "clasificacion" "clasificacion_lote_enum" NOT NULL,
            "parametrosUtilizados" jsonb NOT NULL,
            "empresaId" integer NOT NULL,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "FK_historial_lote" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE
          )
        `);

        await queryRunner.query(`
          CREATE INDEX "IDX_historial_empresa_lote_fecha"
          ON "lote_clasificacion_historial" ("empresaId", "loteId", "createdAt")
        `);

        // 7. Migrar clasificaciones vigentes al historial
        await queryRunner.query(`
          INSERT INTO "lote_clasificacion_historial" ("loteId", "clasificacion", "parametrosUtilizados", "empresaId", "createdAt")
          SELECT id,
                 clasificacion::"clasificacion_lote_enum",
                 '[]'::jsonb,
                 "empresaId",
                 now()
          FROM "lotes"
          WHERE clasificacion IS NOT NULL
        `);

        // 8. Crear enum para notificaciones
        await queryRunner.query(`
          CREATE TYPE "notificaciones_tipo_enum" AS ENUM (
            'lote_no_apto',
            'lote_en_revision'
          )
        `);

        // 9. Crear tabla notificaciones
        await queryRunner.query(`
          CREATE TABLE "notificaciones" (
            "id" SERIAL PRIMARY KEY,
            "tipo" "notificaciones_tipo_enum" NOT NULL,
            "mensaje" varchar NOT NULL,
            "data" jsonb,
            "usuarioId" integer NOT NULL,
            "empresaId" integer NOT NULL,
            "leida" boolean NOT NULL DEFAULT false,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "FK_notificaciones_usuario" FOREIGN KEY ("usuarioId") REFERENCES "users"("id")
          )
        `);

        await queryRunner.query(`
          CREATE INDEX "IDX_notificaciones_empresa_usuario_leida"
          ON "notificaciones" ("empresaId", "usuarioId", "leida")
        `);

        // 10. Crear función y trigger para trazabilidad automática
        await queryRunner.query(`
          CREATE OR REPLACE FUNCTION insert_clasificacion_historial()
          RETURNS TRIGGER AS $$
          BEGIN
              IF NEW.clasificacion IS DISTINCT FROM OLD.clasificacion THEN
                  INSERT INTO lote_clasificacion_historial (
                      "loteId", "clasificacion", "parametrosUtilizados", "empresaId", "createdAt"
                  )
                  VALUES (
                      NEW.id, NEW.clasificacion, '[]'::jsonb, NEW."empresaId", now()
                  );
              END IF;
              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
          CREATE TRIGGER trg_insert_clasificacion_historial
          AFTER UPDATE OF clasificacion ON lotes
          FOR EACH ROW
          EXECUTE FUNCTION insert_clasificacion_historial();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Notificaciones
        await queryRunner.query(`DROP TABLE "notificaciones"`);
        await queryRunner.query(`DROP TYPE "notificaciones_tipo_enum"`);

        // Trigger y función
        await queryRunner.query(`DROP TRIGGER IF EXISTS trg_insert_clasificacion_historial ON lotes`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS insert_clasificacion_historial`);

        // Historial
        await queryRunner.query(`DROP TABLE "lote_clasificacion_historial"`);

        // Revertir enum de lotes
        await queryRunner.query(`DROP TYPE IF EXISTS "clasificacion_lote_enum"`);
    }
}
