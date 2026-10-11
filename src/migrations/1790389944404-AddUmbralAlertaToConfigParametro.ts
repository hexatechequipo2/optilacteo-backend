import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUmbralAlertaToConfigParametro1790389944404 implements MigrationInterface {
    name = 'AddUmbralAlertaToConfigParametro1790389944404'

    public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar los nuevos umbrales como nullable inicialmente
    await queryRunner.query(`
      ALTER TABLE "configuracion_parametros"
      ADD COLUMN "umbral_alerta_min" NUMERIC(10,2),
      ADD COLUMN "umbral_alerta_max" NUMERIC(10,2)
    `);

    // 2. Completar los registros existentes.
    //    Se agrega un margen del 10% alrededor del rango normal.
    await queryRunner.query(`
      UPDATE "configuracion_parametros"
      SET
        "umbral_alerta_min" =
          "umbral_min" - (("umbral_max" - "umbral_min") * 0.10),
        "umbral_alerta_max" =
          "umbral_max" + (("umbral_max" - "umbral_min") * 0.10)
    `);

    // 3. A partir de ahora los campos son obligatorios.
    await queryRunner.query(`
      ALTER TABLE "configuracion_parametros"
      ALTER COLUMN "umbral_alerta_min" SET NOT NULL,
      ALTER COLUMN "umbral_alerta_max" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "configuracion_parametros"
      DROP COLUMN "umbral_alerta_min",
      DROP COLUMN "umbral_alerta_max"
    `);
  }

}
