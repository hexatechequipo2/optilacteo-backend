import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndEmpresas1750000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE "empresas" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "cuit" character varying,
        "email" character varying,
        "telefono" character varying,
        "direccion" character varying,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "UQ_empresas_name" UNIQUE ("name"),
        CONSTRAINT "PK_empresas_id" PRIMARY KEY ("id")
      )
    `);

        await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('admin', 'op_linea', 'gerente', 'responsable_calidad')
    `);

        await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'admin',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "empresaId" integer,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

        await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_empresa"
      FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_empresa"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "users_role_enum"`);
        await queryRunner.query(`DROP TABLE "empresas"`);
    }
}