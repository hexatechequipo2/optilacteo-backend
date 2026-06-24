import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanAndEmpresaModulos1750000100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TYPE "empresas_plan_enum" AS ENUM ('starter', 'pro', 'enterprise')
    `);

        await queryRunner.query(`
      ALTER TABLE "empresas"
      ADD COLUMN "plan" "empresas_plan_enum" NOT NULL DEFAULT 'starter'
    `);

        await queryRunner.query(`
      CREATE TYPE "empresa_modulos_modulo_enum" AS ENUM ('usuarios', 'reportes', 'inventario', 'produccion', 'calidad')
    `);

        await queryRunner.query(`
      CREATE TABLE "empresa_modulos" (
        "id" SERIAL NOT NULL,
        "modulo" "empresa_modulos_modulo_enum" NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "empresaId" integer,
        CONSTRAINT "PK_empresa_modulos_id" PRIMARY KEY ("id")
      )
    `);

        await queryRunner.query(`
      ALTER TABLE "empresa_modulos"
      ADD CONSTRAINT "FK_empresa_modulos_empresa"
      FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "empresa_modulos" DROP CONSTRAINT "FK_empresa_modulos_empresa"`);
        await queryRunner.query(`DROP TABLE "empresa_modulos"`);
        await queryRunner.query(`DROP TYPE "empresa_modulos_modulo_enum"`);
        await queryRunner.query(`ALTER TABLE "empresas" DROP COLUMN "plan"`);
        await queryRunner.query(`DROP TYPE "empresas_plan_enum"`);
    }
}