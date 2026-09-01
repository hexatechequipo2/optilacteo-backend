import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuAndIngresoCamara1786833538967 implements MigrationInterface {
  name = 'AddSkuAndIngresoCamara1786833538967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum para unidadMedida de Sku
    await queryRunner.query(`
        CREATE TYPE "public"."skus_unidadmedida_enum" AS ENUM('kg', 'unidades')
        `);

    // Tabla skus
    await queryRunner.query(`
        CREATE TABLE "skus" (
            "id" SERIAL NOT NULL,
            "empresaId" integer NOT NULL,
            "nombre" character varying NOT NULL,
            "unidadMedida" "public"."skus_unidadmedida_enum" NOT NULL DEFAULT 'unidades',
            "activo" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_skus_id" PRIMARY KEY ("id")
        )
        `);

    await queryRunner.query(`
        ALTER TABLE "skus"
        ADD CONSTRAINT "FK_skus_empresaId" FOREIGN KEY ("empresaId")
        REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Tabla ingresos_camara
    await queryRunner.query(`
        CREATE TABLE "ingresos_camara" (
            "id" SERIAL NOT NULL,
            "empresaId" integer NOT NULL,
            "skuId" integer NOT NULL,
            "cantidad" numeric(10,2) NOT NULL,
            "loteId" integer,
            "fechaIngreso" TIMESTAMP NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_ingresos_camara_id" PRIMARY KEY ("id")
        )
        `);

    await queryRunner.query(`
        ALTER TABLE "ingresos_camara"
        ADD CONSTRAINT "FK_ingresos_camara_empresaId" FOREIGN KEY ("empresaId")
        REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
        ALTER TABLE "ingresos_camara"
        ADD CONSTRAINT "FK_ingresos_camara_skuId" FOREIGN KEY ("skuId")
        REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
        ALTER TABLE "ingresos_camara"
        ADD CONSTRAINT "FK_ingresos_camara_loteId" FOREIGN KEY ("loteId")
        REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    // Índices útiles para el filtrado del historial (GET /ingresos-camara?skuId=)
    await queryRunner.query(`
        CREATE INDEX "IDX_ingresos_camara_empresaId" ON "ingresos_camara" ("empresaId")
        `);
    await queryRunner.query(`
        CREATE INDEX "IDX_ingresos_camara_skuId" ON "ingresos_camara" ("skuId")
        `);
    await queryRunner.query(`
        CREATE INDEX "IDX_skus_empresaId" ON "skus" ("empresaId")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_skus_empresaId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ingresos_camara_skuId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ingresos_camara_empresaId"`,
    );

    await queryRunner.query(`
        ALTER TABLE "ingresos_camara" DROP CONSTRAINT "FK_ingresos_camara_loteId"
        `);
    await queryRunner.query(`
        ALTER TABLE "ingresos_camara" DROP CONSTRAINT "FK_ingresos_camara_skuId"
        `);
    await queryRunner.query(`
        ALTER TABLE "ingresos_camara" DROP CONSTRAINT "FK_ingresos_camara_empresaId"
        `);
    await queryRunner.query(`DROP TABLE "ingresos_camara"`);

    await queryRunner.query(`
        ALTER TABLE "skus" DROP CONSTRAINT "FK_skus_empresaId"
        `);
    await queryRunner.query(`DROP TABLE "skus"`);

    await queryRunner.query(`DROP TYPE "public"."skus_unidadmedida_enum"`);
  }
}
