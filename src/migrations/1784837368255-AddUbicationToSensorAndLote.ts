import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUbicacionToSensorAndLote1753280000000 implements MigrationInterface {
  name = 'AddUbicacionToSensorAndLote1753280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enum compartido entre sensores y lote_ubicacion_historial
    await queryRunner.query(`
      CREATE TYPE "ubicacion_enum" AS ENUM (
        'caldera',
        'laboratorio',
        'camara_frigorifica_1',
        'camara_frigorifica_2',
        'sector_envasado',
        'sector_sellado',
        'sector_embalaje'
      );
    `);

    // 2. Columna en sensores (fija, obligatoria)
    // Default temporal solo para no romper las filas existentes (ids 1 y 34).
    await queryRunner.query(`
      ALTER TABLE "sensores"
      ADD COLUMN "ubicacion" "ubicacion_enum" NOT NULL DEFAULT 'laboratorio';
    `);
    await queryRunner.query(`ALTER TABLE "sensores" ALTER COLUMN "ubicacion" DROP DEFAULT;`);

    // 3. Columna en lotes (opcional)
    await queryRunner.query(`
      ALTER TABLE "lotes"
      ADD COLUMN "ubicacionInicial" "ubicacion_enum";
    `);

    // 4. Tabla nueva de historial de ubicación del lote
    await queryRunner.query(`
      CREATE TABLE "lote_ubicacion_historial" (
        "id" SERIAL PRIMARY KEY,
        "loteId" integer NOT NULL,
        "sensorId" integer NOT NULL,
        "ubicacionAnterior" "ubicacion_enum",
        "ubicacionNueva" "ubicacion_enum" NOT NULL,
        "userId" integer NOT NULL,
        "empresaId" integer NOT NULL,
        "fecha" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lote_ubicacion_historial_lote" FOREIGN KEY ("loteId") REFERENCES "lotes"("id"),
        CONSTRAINT "FK_lote_ubicacion_historial_sensor" FOREIGN KEY ("sensorId") REFERENCES "sensores"("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lote_ubicacion_historial";`);
    await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "ubicacionInicial";`);
    await queryRunner.query(`ALTER TABLE "sensores" DROP COLUMN "ubicacion";`);
    await queryRunner.query(`DROP TYPE "ubicacion_enum";`);
  }
}