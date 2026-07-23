import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSensorTables1753300000000 implements MigrationInterface {
  name = 'CreateSensorTables1753300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ⚠️ Enum tipo_sensor: valores placeholder, pendiente de definición final.
    // Ver conversación: TipoSensor resultaba redundante con Parametro.
    await queryRunner.query(`
      CREATE TYPE "tipo_sensor_enum" AS ENUM (
        'digital', 'analogico', 'manual'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "estado_sensor_enum" AS ENUM ('activo', 'inactivo', 'falla')
    `);

    // ⚠️ NO crear tipo "parametro_enum" acá si ya existe desde la migración
    // de ConfiguracionParametro. Verificar el nombre exacto del tipo con:
    //   \dT+ en psql, o buscar CREATE TYPE en la migración de config-parametro.
    // Si el nombre real es distinto a "parametro_enum", ajustar la línea de la
    // columna "parametro" en la tabla sensores más abajo.

    await queryRunner.query(`
      CREATE TABLE "sensores" (
        "id" SERIAL PRIMARY KEY,
        "nombre" varchar NOT NULL,
        "tipo" "tipo_sensor_enum" NOT NULL,
        "parametro" "configuracion_parametros_parametro_enum" NOT NULL,
        "rango_min_favor" decimal(10,2) NOT NULL,
        "rango_max_favor" decimal(10,2) NOT NULL,
        "estado" "estado_sensor_enum" NOT NULL DEFAULT 'activo',
        "ultimaLectura" timestamp,
        "empresaId" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sensores_empresa" FOREIGN KEY ("empresaId")
          REFERENCES "empresas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sensor_lote_historial" (
        "id" SERIAL PRIMARY KEY,
        "sensorId" integer NOT NULL,
        "loteIdAnterior" integer,
        "loteIdNuevo" integer NOT NULL,
        "userId" integer NOT NULL,
        "empresaId" integer NOT NULL,
        "fecha" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_historial_sensor" FOREIGN KEY ("sensorId")
          REFERENCES "sensores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_historial_lote_anterior" FOREIGN KEY ("loteIdAnterior")
          REFERENCES "lotes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_historial_lote_nuevo" FOREIGN KEY ("loteIdNuevo")
          REFERENCES "lotes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_historial_usuario" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    // Índices para las consultas frecuentes: "última fila por sensor"
    // y "todas las filas de un lote".
    await queryRunner.query(`
      CREATE INDEX "IDX_historial_sensor_fecha"
        ON "sensor_lote_historial" ("sensorId", "fecha" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_historial_lote_nuevo"
        ON "sensor_lote_historial" ("loteIdNuevo")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sensores_empresa"
        ON "sensores" ("empresaId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sensores_empresa"`);
    await queryRunner.query(`DROP INDEX "IDX_historial_lote_nuevo"`);
    await queryRunner.query(`DROP INDEX "IDX_historial_sensor_fecha"`);
    await queryRunner.query(`DROP TABLE "sensor_lote_historial"`);
    await queryRunner.query(`DROP TABLE "sensores"`);
    await queryRunner.query(`DROP TYPE "estado_sensor_enum"`);
    await queryRunner.query(`DROP TYPE "tipo_sensor_enum"`);
    // No se dropea "parametro_enum" acá porque no la creamos en este archivo.
  }
}