import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNivelAlertaToNotificaciones1786412713529 implements MigrationInterface {
    name = 'AddNivelAlertaToNotificaciones1786412713529'

    // Nota: desde Postgres 12+, ALTER TYPE ... ADD VALUE SÍ puede ejecutarse
  // dentro de una transacción. La única restricción es no poder *usar*
  // (INSERT/UPDATE) ese valor nuevo dentro de la misma transacción en que
  // se agrega, algo que esta migración no hace. Por eso no hace falta
  // desactivar el modo transaccional (transaction = false), y así respeta
  // el modo transaccional global configurado en el proyecto ("all").
 
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar el valor nuevo al enum existente notificaciones_tipo_enum
    await queryRunner.query(`
      ALTER TYPE "public"."notificaciones_tipo_enum"
      ADD VALUE IF NOT EXISTS 'alerta_umbral'
    `);
 
    // 2. Crear el tipo enum para nivel_alerta (HU-25)
    await queryRunner.query(`
      CREATE TYPE "public"."notificaciones_nivel_alerta_enum" AS ENUM (
        'informativa',
        'advertencia',
        'critica'
      )
    `);
 
    // 3. Agregar la columna nivel_alerta (nullable, ver comentario en la entidad)
    await queryRunner.query(`
      ALTER TABLE "notificaciones"
      ADD "nivel_alerta" "public"."notificaciones_nivel_alerta_enum"
    `);
  }
 
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar la columna nivel_alerta
    await queryRunner.query(`
      ALTER TABLE "notificaciones"
      DROP COLUMN "nivel_alerta"
    `);
 
    // 2. Eliminar el tipo enum de nivel_alerta
    await queryRunner.query(`
      DROP TYPE "public"."notificaciones_nivel_alerta_enum"
    `);
 
    // 3. Postgres no permite hacer "ALTER TYPE ... DROP VALUE".
    // Si en algún momento necesitás revertir 'alerta_umbral' del enum
    // notificaciones_tipo_enum, hay que recrear el tipo completo:
    //
    // await queryRunner.query(`ALTER TYPE "public"."notificaciones_tipo_enum" RENAME TO "notificaciones_tipo_enum_old"`);
    // await queryRunner.query(`CREATE TYPE "public"."notificaciones_tipo_enum" AS ENUM ('lote_no_apto')`);
    // await queryRunner.query(`ALTER TABLE "notificaciones" ALTER COLUMN "tipo" TYPE "public"."notificaciones_tipo_enum" USING "tipo"::text::"public"."notificaciones_tipo_enum"`);
    // await queryRunner.query(`DROP TYPE "public"."notificaciones_tipo_enum_old"`);
    //
    // Se deja comentado: solo es seguro ejecutarlo si no hay filas con
    // tipo = 'alerta_umbral' en la tabla al momento de revertir (si las hay,
    // el USING fallaría porque el valor no existiría en el enum reducido).
  }
}
