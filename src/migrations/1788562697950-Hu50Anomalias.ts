import { MigrationInterface, QueryRunner } from "typeorm";

export class Hu50Anomalias1788562697950 implements MigrationInterface {
    name = 'Hu50Anomalias1788562697950'

    public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------
    // 1. Agregar valores nuevos a enums Postgres existentes.
    // Confirmado contra \d notificaciones: notificaciones_tipo_enum y
    // notificaciones_estado_enum.
    // ------------------------------------------------------------
    await queryRunner.query(
      `ALTER TYPE "notificaciones_tipo_enum" ADD VALUE IF NOT EXISTS 'alerta_anomalia'`,
    );
    await queryRunner.query(
      `ALTER TYPE "notificaciones_estado_enum" ADD VALUE IF NOT EXISTS 'falso_positivo'`,
    );

    // ------------------------------------------------------------
    // 2. Nuevo tipo enum para el desvío de anomalía.
    // Valores alineados con TipoDesvioAnomalia
    // (notificaciones/enums/tipo-desvio-anomalia.enum.ts).
    // ------------------------------------------------------------
    await queryRunner.query(
      `CREATE TYPE "notificaciones_tipo_desvio_enum" AS ENUM (
        'pico', 'tendencia', 'varianza_atipica', 'nivel_atipico'
      )`,
    );

    // ------------------------------------------------------------
    // 3. Columnas nuevas en notificaciones.
    // ------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "notificaciones"
        ADD COLUMN "tipo_desvio" "notificaciones_tipo_desvio_enum" NULL,
        ADD COLUMN "confianza" DECIMAL(5,2) NULL,
        ADD COLUMN "modelo_version" VARCHAR NULL,
        ADD COLUMN "marcada_falso_positivo_por_id" INT NULL,
        ADD COLUMN "fecha_marcado_falso_positivo" TIMESTAMPTZ NULL
    `);

    // ------------------------------------------------------------
    // 4. FK del usuario que marca falso positivo. ON DELETE SET NULL,
    // mismo criterio que FK_notificaciones_sensor (columna opcional).
    // ------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "notificaciones"
        ADD CONSTRAINT "FK_notificaciones_marcada_falso_positivo_por"
        FOREIGN KEY ("marcada_falso_positivo_por_id") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    // ------------------------------------------------------------
    // 5. Dedupe de anomalías: en vez de crear un índice nuevo redundante,
    // se DROPEA el índice existente de HU-27
    // (IDX_notificaciones_empresa_lote_parametro_estado) y se recrea
    // agregando tipo_desvio como último campo. Sirve para ambos casos:
    // - HU-27 (findAlertaAbiertaPorLoteYParametro): sigue funcionando
    //   igual, un índice compuesto cubre prefijos de sus propias columnas.
    // - HU-50 (findAlertaAbiertaAnomalia): ahora cubierto también.
    // ------------------------------------------------------------
    await queryRunner.query(
      `DROP INDEX "IDX_notificaciones_empresa_lote_parametro_estado"`,
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_notificaciones_empresa_lote_parametro_tipodesvio_estado"
      ON "notificaciones" ("empresaId", lote_id, parametro, tipo_desvio, estado)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_notificaciones_empresa_lote_parametro_tipodesvio_estado"`,
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_notificaciones_empresa_lote_parametro_estado"
      ON "notificaciones" ("empresaId", lote_id, parametro, estado)
    `);

    await queryRunner.query(`
      ALTER TABLE "notificaciones"
        DROP CONSTRAINT "FK_notificaciones_marcada_falso_positivo_por"
    `);

    await queryRunner.query(`
      ALTER TABLE "notificaciones"
        DROP COLUMN "tipo_desvio",
        DROP COLUMN "confianza",
        DROP COLUMN "modelo_version",
        DROP COLUMN "marcada_falso_positivo_por_id",
        DROP COLUMN "fecha_marcado_falso_positivo"
    `);

    await queryRunner.query(`DROP TYPE "notificaciones_tipo_desvio_enum"`);

    // Nota: Postgres no permite quitar valores de un enum con ALTER TYPE.
    // Revertir 'alerta_anomalia' y 'falso_positivo' de los enums existentes
    // requeriría recrear el tipo entero — no se hace automático acá porque
    // si ya existen filas con esos valores hay que migrarlas primero a mano.
  }

}
