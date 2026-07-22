import { MigrationInterface, QueryRunner } from 'typeorm';

// Asume: tabla 'empresas' (Empresa entity) y tabla 'proveedores' (Proveedor entity).
// Si tu Proveedor entity tiene otro nombre de tabla, ajustá las referencias de FK abajo.
export class CreateLoteTables1753200000000 implements MigrationInterface {
  name = 'CreateLoteTables1753200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Enums ---
    await queryRunner.query(`
      CREATE TYPE "lotes_tipo_materia_prima_enum" AS ENUM (
        'leche_cruda', 'crema_de_leche', 'masa_hilada'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "lotes_clasificacion_enum" AS ENUM (
        'primera', 'segunda', 'tercera', 'rechazado'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "lotes_destinoInicial_enum" AS ENUM (
        'produccion', 'almacenamiento', 'tratamiento', 'descarte'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "lotes_estado_enum" AS ENUM (
        'registrado', 'en_proceso', 'finalizado', 'rechazado'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "lote_parametros_parametro_enum" AS ENUM (
        'ph', 'temperatura', 'densidad', 'grasa', 'proteina', 'acidez', 'conductividad'
      )
    `);

    // --- Tabla lotes ---
    await queryRunner.query(`
      CREATE TABLE "lotes" (
        "id" SERIAL PRIMARY KEY,
        "codigo" character varying NOT NULL,
        "empresaId" integer NOT NULL,
        "proveedorId" integer NOT NULL,
        "tipo_materia_prima" "lotes_tipo_materia_prima_enum" NOT NULL,
        "fechaIngreso" TIMESTAMP NOT NULL,
        "clasificacion" "lotes_clasificacion_enum",
        "destinoInicial" "lotes_destinoInicial_enum",
        "estado" "lotes_estado_enum" NOT NULL DEFAULT 'registrado',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_lotes_empresaId_codigo" UNIQUE ("empresaId", "codigo")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "lotes"
      ADD CONSTRAINT "FK_lotes_empresa"
      FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "lotes"
      ADD CONSTRAINT "FK_lotes_proveedor"
      FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_lotes_empresaId" ON "lotes" ("empresaId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lotes_proveedorId" ON "lotes" ("proveedorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lotes_estado" ON "lotes" ("estado")`,
    );

    // --- Tabla lote_parametros ---
    await queryRunner.query(`
      CREATE TABLE "lote_parametros" (
        "id" SERIAL PRIMARY KEY,
        "loteId" integer NOT NULL,
        "parametro" "lote_parametros_parametro_enum" NOT NULL,
        "valor" numeric(10,2) NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "lote_parametros"
      ADD CONSTRAINT "FK_lote_parametros_lote"
      FOREIGN KEY ("loteId") REFERENCES "lotes"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_lote_parametros_loteId" ON "lote_parametros" ("loteId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lote_parametros" DROP CONSTRAINT "FK_lote_parametros_lote"`,
    );
    await queryRunner.query(`DROP TABLE "lote_parametros"`);
    await queryRunner.query(`DROP TYPE "lote_parametros_parametro_enum"`);

    await queryRunner.query(
      `ALTER TABLE "lotes" DROP CONSTRAINT "FK_lotes_proveedor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lotes" DROP CONSTRAINT "FK_lotes_empresa"`,
    );
    await queryRunner.query(`DROP TABLE "lotes"`);

    await queryRunner.query(`DROP TYPE "lotes_estado_enum"`);
    await queryRunner.query(`DROP TYPE "lotes_destinoInicial_enum"`);
    await queryRunner.query(`DROP TYPE "lotes_clasificacion_enum"`);
    await queryRunner.query(`DROP TYPE "lotes_tipo_materia_prima_enum"`);
  }
}