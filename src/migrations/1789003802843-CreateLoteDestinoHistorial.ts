import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLoteDestinoHistorial1789003802843 implements MigrationInterface {
    name = 'CreateLoteDestinoHistorial1789003802843'
  // HU-34: historial UNIFICADO de asignaciones/cambios de destino
  // productivo de un lote — tanto manuales (PATCH /lotes/:id/destino-
  // productivo) como derivados de aceptar/rechazar una recomendación ML
  // (PATCH recomendaciones/:id/responder, HU-49/HU-37).
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lote_destino_historial" (
        "id" SERIAL PRIMARY KEY,
        "loteId" integer NOT NULL,
        "empresaId" integer NOT NULL,
        "destinoProductivoId" integer NOT NULL,
        "destinoAnteriorId" integer,
        "usuarioId" integer NOT NULL,
        "origen" varchar NOT NULL DEFAULT 'manual',
        "recomendacionDestinoId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "lote_destino_historial"
      ADD CONSTRAINT "FK_lote_destino_historial_lote"
      FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "lote_destino_historial"
      ADD CONSTRAINT "FK_lote_destino_historial_destino"
      FOREIGN KEY ("destinoProductivoId") REFERENCES "destinos_productivos"("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "lote_destino_historial"
      ADD CONSTRAINT "FK_lote_destino_historial_destino_anterior"
      FOREIGN KEY ("destinoAnteriorId") REFERENCES "destinos_productivos"("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "lote_destino_historial"
      ADD CONSTRAINT "FK_lote_destino_historial_recomendacion"
      FOREIGN KEY ("recomendacionDestinoId") REFERENCES "recomendaciones_destino"("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lote_destino_historial"`);
  }

}
