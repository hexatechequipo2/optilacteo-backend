import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateModulosSistemaEnum1750000200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Borrar todas las filas existentes (datos de prueba, según lo acordado)
        await queryRunner.query(`DELETE FROM "empresa_modulos"`);

        // 2. Crear el nuevo tipo enum con los 8 módulos reales
        await queryRunner.query(`
      CREATE TYPE "empresa_modulos_modulo_enum_new" AS ENUM (
        'dashboard',
        'recepcion',
        'destino_productivo_ia',
        'monitoreo_alertas',
        'sensores_iot',
        'trazabilidad',
        'reportes_forecast',
        'asistente_voz'
      )
    `);

        // 3. Cambiar la columna para que use el tipo nuevo
        await queryRunner.query(`
      ALTER TABLE "empresa_modulos"
      ALTER COLUMN "modulo" TYPE "empresa_modulos_modulo_enum_new"
      USING "modulo"::text::"empresa_modulos_modulo_enum_new"
    `);

        // 4. Borrar el tipo viejo
        await queryRunner.query(`DROP TYPE "empresa_modulos_modulo_enum"`);

        // 5. Renombrar el tipo nuevo para que quede con el nombre original
        await queryRunner.query(`
      ALTER TYPE "empresa_modulos_modulo_enum_new" RENAME TO "empresa_modulos_modulo_enum"
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "empresa_modulos"`);

        await queryRunner.query(`
      CREATE TYPE "empresa_modulos_modulo_enum_old" AS ENUM (
        'usuarios', 'reportes', 'inventario', 'produccion', 'calidad'
      )
    `);

        await queryRunner.query(`
      ALTER TABLE "empresa_modulos"
      ALTER COLUMN "modulo" TYPE "empresa_modulos_modulo_enum_old"
      USING "modulo"::text::"empresa_modulos_modulo_enum_old"
    `);

        await queryRunner.query(`DROP TYPE "empresa_modulos_modulo_enum"`);

        await queryRunner.query(`
      ALTER TYPE "empresa_modulos_modulo_enum_old" RENAME TO "empresa_modulos_modulo_enum"
    `);
    }
}