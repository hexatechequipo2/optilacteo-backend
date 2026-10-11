import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProveedorEstabilidad1790639596734 implements MigrationInterface {
    name = 'CreateProveedorEstabilidad1790639596734'

    async up(q: QueryRunner): Promise<void> {
        await q.query(`
        CREATE TABLE "proveedor_estabilidad" (
            "id" SERIAL PRIMARY KEY,
            "proveedorId" integer NOT NULL UNIQUE,
            "empresaId" integer NOT NULL,
            "status" varchar NOT NULL,
            "clasificacion" varchar,
            "score" decimal(8,4),
            "detalle" jsonb NOT NULL DEFAULT '[]',
            "cantidadLotes" integer NOT NULL,
            "modeloVersion" varchar,
            "calculadoEn" timestamp NOT NULL DEFAULT now()
        )
        `);
    }

    async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE "proveedor_estabilidad"`);
    }

}
