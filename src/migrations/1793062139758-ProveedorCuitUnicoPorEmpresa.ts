import { MigrationInterface, QueryRunner } from "typeorm";

export class ProveedorCuitUnicoPorEmpresa1793062139758 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    // Primero se crea el nuevo, después se elimina el viejo:
    // no hay ningún momento sin protección de unicidad.
    await queryRunner.query(`
      ALTER TABLE "proveedores"
      ADD CONSTRAINT "UQ_proveedores_empresa_cuit" UNIQUE ("empresa_id", "cuit")
    `);
    await queryRunner.query(`
      ALTER TABLE "proveedores" DROP CONSTRAINT IF EXISTS "UQ_proveedores_cuit"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const duplicados: Array<{ cuit: string }> = await queryRunner.query(`
      SELECT "cuit" FROM "proveedores"
      GROUP BY "cuit" HAVING COUNT(*) > 1
    `);
    if (duplicados.length > 0) {
      throw new Error(
        `No se puede revertir: hay CUITs repetidos entre empresas (${duplicados
          .map((d) => d.cuit)
          .join(', ')}). Resolvelos antes de hacer el down.`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE "proveedores"
      ADD CONSTRAINT "UQ_proveedores_cuit" UNIQUE ("cuit")
    `);
    await queryRunner.query(`
      ALTER TABLE "proveedores" DROP CONSTRAINT IF EXISTS "UQ_proveedores_empresa_cuit"
    `);
  }

}
