import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDestinoRecomendacionType1840000000000 implements MigrationInterface {
  name = 'FixDestinoRecomendacionType1840000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Las columnas destinoRecomendado/destinoReal guardaban el enum de
    // lotes.destinoInicial (produccion/almacenamiento/tratamiento/descarte)
    // — HU-49 usó por error ese enum en vez del destino productivo real de
    // HU-34 (tabla destinos_productivos). Si esta tabla tuviera filas, esos
    // valores no serían mapeables a destinos_productivos: no hay
    // correspondencia entre ambos catálogos. Verificado en desarrollo que
    // tiene 0 filas, así que se dropean las columnas sin migrar datos.
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "destinoRecomendado"
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "destinoReal"
    `);

    await queryRunner.query(`DROP TYPE "recomendaciones_destino_destinorecomendado_enum"`);
    await queryRunner.query(`DROP TYPE "recomendaciones_destino_destinoreal_enum"`);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "destinoRecomendadoId" integer NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "destinoRealId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD CONSTRAINT "FK_recomendaciones_destino_destinoRecomendado"
      FOREIGN KEY ("destinoRecomendadoId") REFERENCES "destinos_productivos"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD CONSTRAINT "FK_recomendaciones_destino_destinoReal"
      FOREIGN KEY ("destinoRealId") REFERENCES "destinos_productivos"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recomendaciones_destino_destinoRecomendadoId"
      ON "recomendaciones_destino" ("destinoRecomendadoId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_recomendaciones_destino_destinoRealId"
      ON "recomendaciones_destino" ("destinoRealId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_recomendaciones_destino_destinoRealId"`);
    await queryRunner.query(`DROP INDEX "IDX_recomendaciones_destino_destinoRecomendadoId"`);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP CONSTRAINT "FK_recomendaciones_destino_destinoReal"
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP CONSTRAINT "FK_recomendaciones_destino_destinoRecomendado"
    `);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "destinoRealId"
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "destinoRecomendadoId"
    `);

    await queryRunner.query(`
      CREATE TYPE "recomendaciones_destino_destinorecomendado_enum" AS ENUM (
        'produccion', 'almacenamiento', 'tratamiento', 'descarte'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "recomendaciones_destino_destinoreal_enum" AS ENUM (
        'produccion', 'almacenamiento', 'tratamiento', 'descarte'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "destinoRecomendado" "recomendaciones_destino_destinorecomendado_enum" NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "destinoReal" "recomendaciones_destino_destinoreal_enum"
    `);
  }
}
