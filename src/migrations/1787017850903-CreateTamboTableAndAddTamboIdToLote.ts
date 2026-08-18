import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTamboTableAndAddTamboIdToLote1787017850903 implements MigrationInterface {
    name = 'CreateTamboTableAndAddTamboIdToLote1787017850903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- 1. Tabla tambos ---
        await queryRunner.query(`
        CREATE TABLE "tambos" (
            "id" SERIAL NOT NULL,
            "nombre" character varying(150) NOT NULL,
            "ubicacion" character varying(255),
            "activo" boolean NOT NULL DEFAULT true,
            "empresa_id" integer NOT NULL,
            "proveedor_id" integer NOT NULL,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_tambos_id" PRIMARY KEY ("id")
        )
        `);
    
        // FK tambos.proveedor_id -> proveedores.id (RESTRICT: no se puede
        // borrar un proveedor que tenga tambos asociados)
        await queryRunner.query(`
        ALTER TABLE "tambos"
        ADD CONSTRAINT "FK_tambos_proveedor_id"
        FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    
        // FK tambos.empresa_id -> empresa.id
        await queryRunner.query(`
        ALTER TABLE "tambos"
        ADD CONSTRAINT "FK_tambos_empresa_id"
        FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    
        // Índices para los filtros que ya usa TamboRepository/TamboService
        // (siempre se consulta por empresaId, y frecuentemente por proveedorId)
        await queryRunner.query(`
        CREATE INDEX "IDX_tambos_empresa_id" ON "tambos" ("empresa_id")
        `);
        await queryRunner.query(`
        CREATE INDEX "IDX_tambos_proveedor_id" ON "tambos" ("proveedor_id")
        `);
    
        // --- 2. Columna tamboId en lotes ---
        // La tabla lotes ya tiene filas (datos de prueba, no reales), así
        // que no se puede agregar tamboId como NOT NULL directo — hay que
        // agregarla nullable, completar (backfill) un tambo válido para
        // los lotes existentes, y recién ahí forzar NOT NULL.
        await queryRunner.query(`
        ALTER TABLE "lotes"
        ADD "tamboId" integer
        `);

        // Crea un tambo placeholder por cada combinación (proveedor, empresa)
        // que ya tenga lotes cargados, para poder asignarles un tamboId
        // válido sin inventar un origen que no existía antes de esta HU.
        await queryRunner.query(`
        INSERT INTO "tambos" ("nombre", "activo", "empresa_id", "proveedor_id")
        SELECT DISTINCT 'Sin especificar (migración HU-36)', true, l."empresaId", l."proveedorId"
        FROM "lotes" l
        WHERE NOT EXISTS (
            SELECT 1 FROM "tambos" t
            WHERE t."proveedor_id" = l."proveedorId"
              AND t."empresa_id" = l."empresaId"
              AND t."nombre" = 'Sin especificar (migración HU-36)'
        )
        `);

        // Asigna ese tambo placeholder a los lotes existentes
        await queryRunner.query(`
        UPDATE "lotes" l
        SET "tamboId" = t."id"
        FROM "tambos" t
        WHERE t."proveedor_id" = l."proveedorId"
          AND t."empresa_id" = l."empresaId"
          AND t."nombre" = 'Sin especificar (migración HU-36)'
          AND l."tamboId" IS NULL
        `);

        // Recién ahora, con todas las filas completas, se puede forzar NOT NULL
        await queryRunner.query(`
        ALTER TABLE "lotes"
        ALTER COLUMN "tamboId" SET NOT NULL
        `);
    
        await queryRunner.query(`
        ALTER TABLE "lotes"
        ADD CONSTRAINT "FK_lotes_tamboId"
        FOREIGN KEY ("tamboId") REFERENCES "tambos"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    
        await queryRunner.query(`
        CREATE INDEX "IDX_lotes_tamboId" ON "lotes" ("tamboId")
        `);
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir en orden inverso al up().
        // Nota: el DROP TABLE "tambos" al final también borra los tambos
        // placeholder creados en el backfill del up() — el rollback queda
        // completo, no hace falta un paso extra para limpiarlos.

        await queryRunner.query(`
        DROP INDEX "IDX_lotes_tamboId"
        `);
        await queryRunner.query(`
        ALTER TABLE "lotes" DROP CONSTRAINT "FK_lotes_tamboId"
        `);
        await queryRunner.query(`
        ALTER TABLE "lotes" DROP COLUMN "tamboId"
        `);
    
        await queryRunner.query(`
        DROP INDEX "IDX_tambos_proveedor_id"
        `);
        await queryRunner.query(`
        DROP INDEX "IDX_tambos_empresa_id"
        `);
        await queryRunner.query(`
        ALTER TABLE "tambos" DROP CONSTRAINT "FK_tambos_empresa_id"
        `);
        await queryRunner.query(`
        ALTER TABLE "tambos" DROP CONSTRAINT "FK_tambos_proveedor_id"
        `);
        await queryRunner.query(`
        DROP TABLE "tambos"
        `);
    }
}