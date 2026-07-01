import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProveedores1782770349535 implements MigrationInterface {
  name = 'CreateProveedores1782770349535';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."proveedores_tipo_enum" AS ENUM(
        'tambo',
        'transporte',
        'insumos',
        'laboratorio'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."proveedores_estado_enum" AS ENUM(
        'activa',
        'trial',
        'suspendida'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "proveedores" (
        "id" SERIAL NOT NULL,
        "razon_social" character varying(200) NOT NULL,
        "cuit" character varying(13) NOT NULL,
        "telefono" character varying(20),
        "email_contacto" character varying(150),
        "tipo" "public"."proveedores_tipo_enum" NOT NULL DEFAULT 'tambo',
        "provincia" character varying(100),
        "localidad" character varying(100),
        "capacidad" numeric(10,2),
        "estado" "public"."proveedores_estado_enum" NOT NULL DEFAULT 'activa',
        "empresa_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_proveedores_cuit" UNIQUE ("cuit"),
        CONSTRAINT "PK_proveedores" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "proveedores"
        ADD CONSTRAINT "FK_proveedores_empresa_id"
        FOREIGN KEY ("empresa_id")
        REFERENCES "empresas"("id")
        ON DELETE RESTRICT
        ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "proveedores"
        DROP CONSTRAINT "FK_proveedores_empresa_id"
    `);

    await queryRunner.query(`DROP TABLE "proveedores"`);

    await queryRunner.query(`DROP TYPE "public"."proveedores_estado_enum"`);

    await queryRunner.query(`DROP TYPE "public"."proveedores_tipo_enum"`);
  }
}