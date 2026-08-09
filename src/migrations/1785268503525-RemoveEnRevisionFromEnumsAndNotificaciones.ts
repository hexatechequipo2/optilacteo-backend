import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveEnRevisionFromEnumsAndNotificaciones1785268503525 implements MigrationInterface {
  name = 'RemoveEnRevisionFromEnumsAndNotificaciones1785268503525';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Borrar trigger y función que dependen de la columna
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_insert_clasificacion_historial ON lotes`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS insert_clasificacion_historial`,
    );

    // 1. Cambiar enum de clasificacion_lote
    await queryRunner.query(
      `ALTER TYPE "clasificacion_lote_enum" RENAME TO "clasificacion_lote_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "clasificacion_lote_enum" AS ENUM ('apto', 'no_apto')`,
    );

    await queryRunner.query(`
          ALTER TABLE "lotes"
          ALTER COLUMN "clasificacion" TYPE "clasificacion_lote_enum"
          USING clasificacion::text::"clasificacion_lote_enum"
        `);

    await queryRunner.query(`
          ALTER TABLE "lote_clasificacion_historial"
          ALTER COLUMN "clasificacion" TYPE "clasificacion_lote_enum"
          USING clasificacion::text::"clasificacion_lote_enum"
        `);

    await queryRunner.query(`DROP TYPE "clasificacion_lote_enum_old"`);

    // 2. Cambiar enum de notificaciones
    await queryRunner.query(
      `ALTER TYPE "notificaciones_tipo_enum" RENAME TO "notificaciones_tipo_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "notificaciones_tipo_enum" AS ENUM ('lote_no_apto')`,
    );

    await queryRunner.query(`
          ALTER TABLE "notificaciones"
          ALTER COLUMN "tipo" TYPE "notificaciones_tipo_enum"
          USING tipo::text::"notificaciones_tipo_enum"
        `);

    await queryRunner.query(`DROP TYPE "notificaciones_tipo_enum_old"`);

    // 3. Volver a crear función y trigger
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
    // Borrar trigger y función
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_insert_clasificacion_historial ON lotes`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS insert_clasificacion_historial`,
    );

    // Revertir enums a su versión anterior
    await queryRunner.query(
      `ALTER TYPE "clasificacion_lote_enum" RENAME TO "clasificacion_lote_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "clasificacion_lote_enum" AS ENUM ('apto', 'no_apto', 'en_revision')`,
    );
    await queryRunner.query(`
          ALTER TABLE "lotes"
          ALTER COLUMN "clasificacion" TYPE "clasificacion_lote_enum"
          USING clasificacion::text::"clasificacion_lote_enum"
        `);
    await queryRunner.query(`
          ALTER TABLE "lote_clasificacion_historial"
          ALTER COLUMN "clasificacion" TYPE "clasificacion_lote_enum"
          USING clasificacion::text::"clasificacion_lote_enum"
        `);
    await queryRunner.query(`DROP TYPE "clasificacion_lote_enum_new"`);

    await queryRunner.query(
      `ALTER TYPE "notificaciones_tipo_enum" RENAME TO "notificaciones_tipo_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "notificaciones_tipo_enum" AS ENUM ('lote_no_apto', 'lote_en_revision')`,
    );
    await queryRunner.query(`
          ALTER TABLE "notificaciones"
          ALTER COLUMN "tipo" TYPE "notificaciones_tipo_enum"
          USING tipo::text::"notificaciones_tipo_enum"
        `);
    await queryRunner.query(`DROP TYPE "notificaciones_tipo_enum_new"`);

    // Volver a crear función y trigger originales
    await queryRunner.query(`
          CREATE OR REPLACE FUNCTION insert_clasificacion_historial()
          RETURNS TRIGGER AS $$
          BEGIN
              IF NEW.clasificacion IS DISTINCT FROM OLD.clasificacion THEN
                  INSERT INTO lote_clasificacion_historial (
                      "loteId", "clasificacion", "parametrosUtilizados", "empresaId", "createdAt"
                  )
                  VALUES (
                      NEW.id, NEW.clasificacion, '[]'::jsonb, NEW."empresaId", now());
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
}
