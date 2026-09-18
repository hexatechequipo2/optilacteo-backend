import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoteConsumoIdToRecomendacionesDestino1788383786490 implements MigrationInterface {
    name = 'AddLoteConsumoIdToRecomendacionesDestino1788383786490'

    public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable: una recomendación puede venir del alta original del lote
    // (sin consumo asociado) o de un consumo posterior con parámetros
    // nuevos (HU-49 AC1 aplicado también a HU-68).
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "loteConsumoId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD CONSTRAINT "FK_recomendaciones_destino_loteConsumo"
      FOREIGN KEY ("loteConsumoId") REFERENCES "lote_consumo"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recomendaciones_destino_loteConsumoId"
      ON "recomendaciones_destino" ("loteConsumoId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_recomendaciones_destino_loteConsumoId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      DROP CONSTRAINT "FK_recomendaciones_destino_loteConsumo"
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "loteConsumoId"
    `);
  }

}
