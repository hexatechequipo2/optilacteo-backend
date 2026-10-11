import { MigrationInterface, QueryRunner } from 'typeorm';

const MODULOS_SISTEMA = [
  'dashboard',
  'recepcion',
  'destino_productivo_ia',
  'monitoreo_alertas',
  'sensores_iot',
  'trazabilidad',
  'reportes_forecast',
  'asistente_voz',
];
const ANTES = [...MODULOS_SISTEMA, 'gestion_roles'];
const DESPUES = [
  ...ANTES,
  'gestion_usuarios',
  'auditoria',
  'plataforma',
  'configuracion_empresa',
];

/**
 * HU-72: agrega a permiso_modulos_modulo_enum los módulos administrativos que
 * faltaban (insertarlos daba 500 desde /roles).
 *
 * No usa ALTER TYPE ... ADD VALUE: un valor agregado así no se puede usar
 * hasta que la transacción commitea, y migration:run corre todas las
 * migraciones pendientes en una sola transacción (modo "all", que además
 * prohíbe transaction = false). Recrear el tipo sí permite usar los valores
 * nuevos en la misma transacción, que es lo que hace el backfill siguiente.
 */
export class AmpliarModulosPermiso1791091175765 implements MigrationInterface {
  name = 'AmpliarModulosPermiso1791091175765';

  public async up(q: QueryRunner): Promise<void> {
    await recrearEnum(q, DESPUES);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM "permiso_modulos" WHERE "modulo"::text <> ALL($1::text[])`,
      [ANTES],
    );
    await recrearEnum(q, ANTES);
  }
}

async function recrearEnum(q: QueryRunner, valores: string[]): Promise<void> {
  const lista = valores.map((v) => `'${v}'`).join(', ');
  await q.query(
    `ALTER TYPE "permiso_modulos_modulo_enum" RENAME TO "permiso_modulos_modulo_enum_old"`,
  );
  await q.query(`CREATE TYPE "permiso_modulos_modulo_enum" AS ENUM (${lista})`);
  await q.query(`
    ALTER TABLE "permiso_modulos"
      ALTER COLUMN "modulo" TYPE "permiso_modulos_modulo_enum"
      USING "modulo"::text::"permiso_modulos_modulo_enum"
  `);
  await q.query(`DROP TYPE "permiso_modulos_modulo_enum_old"`);
}
