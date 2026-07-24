import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSensorLecturasYEventos1784919820164 implements MigrationInterface {
  name = 'CreateSensorLecturasYEventos1784919820164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tipo_evento_enum" AS ENUM (
        'sensor_no_encontrado',
        'lote_no_encontrado',
        'sensor_no_asociado_a_lote',
        'valor_fuera_de_rango',
        'sensor_inactivo'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sensor_lecturas" (
        "id" SERIAL PRIMARY KEY,
        "sensorId" integer NOT NULL,
        "loteId" integer NOT NULL,
        "valor" decimal(10,2) NOT NULL,
        "timestampLectura" timestamptz NOT NULL,
        "empresaId" integer NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sensor_lecturas_sensor" FOREIGN KEY ("sensorId")
          REFERENCES "sensores"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sensor_lecturas_lote" FOREIGN KEY ("loteId")
          REFERENCES "lotes"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sensor_lecturas_empresa" FOREIGN KEY ("empresaId")
          REFERENCES "empresas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sensor_eventos" (
        "id" SERIAL PRIMARY KEY,
        "tipoEvento" "tipo_evento_enum" NOT NULL,
        "sensorId" integer,
        "sensorIdRecibido" varchar,
        "loteId" integer,
        "loteIdRecibido" varchar,
        "valorRecibido" decimal(10,2),
        "empresaId" integer NOT NULL,
        "detalle" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sensor_eventos_sensor" FOREIGN KEY ("sensorId")
          REFERENCES "sensores"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_sensor_eventos_lote" FOREIGN KEY ("loteId")
          REFERENCES "lotes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_sensor_eventos_empresa" FOREIGN KEY ("empresaId")
          REFERENCES "empresas"("id") ON DELETE CASCADE
      )
    `);

    // Índices para las consultas frecuentes: últimas lecturas por sensor/lote,
    // y últimos eventos por empresa (pantalla de auditoría del operario).
    await queryRunner.query(`
      CREATE INDEX "IDX_sensor_lecturas_sensor_timestamp"
        ON "sensor_lecturas" ("sensorId", "timestampLectura" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sensor_lecturas_lote"
        ON "sensor_lecturas" ("loteId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sensor_lecturas_empresa"
        ON "sensor_lecturas" ("empresaId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sensor_eventos_empresa_createdAt"
        ON "sensor_eventos" ("empresaId", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sensor_eventos_sensor"
        ON "sensor_eventos" ("sensorId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sensor_eventos_sensor"`);
    await queryRunner.query(
      `DROP INDEX "IDX_sensor_eventos_empresa_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_sensor_lecturas_empresa"`);
    await queryRunner.query(`DROP INDEX "IDX_sensor_lecturas_lote"`);
    await queryRunner.query(
      `DROP INDEX "IDX_sensor_lecturas_sensor_timestamp"`,
    );
    await queryRunner.query(`DROP TABLE "sensor_eventos"`);
    await queryRunner.query(`DROP TABLE "sensor_lecturas"`);
    await queryRunner.query(`DROP TYPE "tipo_evento_enum"`);
  }
}
