import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfiguracionComparacionHistorica1785354715121 implements MigrationInterface {
  name = 'CreateConfiguracionComparacionHistorica1785354715121';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "configuracion_comparacion_historica" (
                "id" SERIAL PRIMARY KEY,
                "empresa_id" integer NOT NULL,
                "desvio_significativo_porcentaje" decimal(5,2) NOT NULL DEFAULT 15,
                "cantidad_registros_historicos" integer NOT NULL DEFAULT 20,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_cch_empresa" UNIQUE ("empresa_id"),
                CONSTRAINT "FK_cch_empresa" FOREIGN KEY ("empresa_id")
                    REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "configuracion_comparacion_historica"`);
  }
}
