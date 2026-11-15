import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexLoteConsumoProduccion1793060274389 implements MigrationInterface {

    public async up(q: QueryRunner): Promise<void> {
        await q.query(
        `CREATE INDEX IF NOT EXISTS "IDX_lote_consumo_loteProduccionId"
            ON "lote_consumo" ("loteProduccionId")`,
        );
    }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_lote_consumo_loteProduccionId"`);
  }

}
