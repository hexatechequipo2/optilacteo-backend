import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSensorRecuperadoToTipoEventoEnum1784922794756 implements MigrationInterface {
  name = 'AddSensorRecuperadoToTipoEventoEnum1784922794756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "tipo_evento_enum" ADD VALUE 'sensor_recuperado'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres no permite DROP VALUE de un enum: recreamos el tipo sin el
    // valor nuevo (mismo patrón que UpdateModulosSistemaEnum1750000200000).
    // Falla si ya hay filas de sensor_eventos usando 'sensor_recuperado'.
    await queryRunner.query(`
      CREATE TYPE "tipo_evento_enum_old" AS ENUM (
        'sensor_no_encontrado',
        'lote_no_encontrado',
        'sensor_no_asociado_a_lote',
        'valor_fuera_de_rango',
        'sensor_inactivo'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sensor_eventos"
      ALTER COLUMN "tipoEvento" TYPE "tipo_evento_enum_old"
      USING "tipoEvento"::text::"tipo_evento_enum_old"
    `);
    await queryRunner.query(`DROP TYPE "tipo_evento_enum"`);
    await queryRunner.query(`
      ALTER TYPE "tipo_evento_enum_old" RENAME TO "tipo_evento_enum"
    `);
  }
}
