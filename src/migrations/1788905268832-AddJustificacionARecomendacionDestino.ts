import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJustificacionARecomendacionDestino1788905268832 implements MigrationInterface {
    name = 'AddJustificacionARecomendacionDestino1788905268832'

    public async up(queryRunner: QueryRunner): Promise<void> {
    // HU-37: registro de justificación cuando el operador elige un destino
    // distinto al recomendado (rechaza la recomendación). Se guardan además
    // quién respondió (usuarioId) y cuándo (respondidaEn), ya que createdAt
    // es la fecha de generación de la recomendación, no de la respuesta.
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "justificacion" text
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "usuarioId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino"
      ADD COLUMN "respondidaEn" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "respondidaEn"
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "usuarioId"
    `);
    await queryRunner.query(`
      ALTER TABLE "recomendaciones_destino" DROP COLUMN "justificacion"
    `);
  }

}
