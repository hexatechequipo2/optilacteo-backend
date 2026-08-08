import { MigrationInterface, QueryRunner } from 'typeorm';
import { ROLES } from '../module/rol/constants/roles.constants';
import { PERMISOS_POR_ROL } from '../module/rol/config/roles-permisos.config';

export class CreateRolesPermisosAndUserRol1751600000000
  implements MigrationInterface
{
  name = 'CreateRolesPermisosAndUserRol1751600000000';

  private enumToRolNombre: Record<string, string> = {
    admin: ROLES.ADMINISTRADOR,
    op_linea: ROLES.OPERARIO_LINEA,
    gerente: ROLES.GERENTE,
    responsable_calidad: ROLES.RESPONSABLE_CALIDAD,
  };

  private todosLosRoles: string[] = Object.values(ROLES);

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. roles
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL NOT NULL,
        "nombre" character varying NOT NULL,
        "descripcion" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "empresaId" integer,
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD CONSTRAINT "FK_roles_empresa"
      FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
      ON DELETE SET NULL
    `);

    // 2. permiso_modulos
    await queryRunner.query(`
      CREATE TABLE "permiso_modulos" (
        "id" SERIAL NOT NULL,
        "modulo" "public"."empresa_modulos_modulo_enum" NOT NULL,
        "canRead" boolean NOT NULL DEFAULT false,
        "canWrite" boolean NOT NULL DEFAULT false,
        "rolId" integer NOT NULL,
        CONSTRAINT "PK_permiso_modulos_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "permiso_modulos"
      ADD CONSTRAINT "FK_permiso_modulos_rol"
      FOREIGN KEY ("rolId") REFERENCES "roles"("id")
      ON DELETE CASCADE
    `);

    // 3. users rol FK
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "rol" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_rol"
      FOREIGN KEY ("rol") REFERENCES "roles"("id")
      ON DELETE SET NULL
    `);

    // 4. crear roles globales
    for (const nombre of this.todosLosRoles) {
      await queryRunner.query(
        `
        INSERT INTO "roles" ("nombre", "descripcion", "isActive", "empresaId")
        VALUES ($1, $2, true, NULL)
        `,
        [nombre, `Rol del catálogo oficial (${nombre})`],
      );
    }

    // 5. 🔥 FIX: crear permisos automáticamente
    for (const nombre of this.todosLosRoles) {
      const permisos = PERMISOS_POR_ROL[nombre];
      if (!permisos) continue;

      const rol = await queryRunner.query(
        `SELECT id FROM roles WHERE nombre = $1 AND "empresaId" IS NULL`,
        [nombre],
      );

      const rolId = rol[0].id;

      for (const p of permisos) {
        await queryRunner.query(
          `
          INSERT INTO permiso_modulos ("modulo", "canRead", "canWrite", "rolId")
          VALUES ($1, $2, $3, $4)
          `,
          [p.modulo, p.canRead, p.canWrite, rolId],
        );
      }
    }

    // 6. migrar users role -> rol
    for (const [enumValue, nombre] of Object.entries(this.enumToRolNombre)) {
      await queryRunner.query(
        `
        UPDATE "users"
        SET "rol" = (SELECT "id" FROM "roles" WHERE "nombre" = $1 AND "empresaId" IS NULL)
        WHERE "role" = $2::users_role_enum
        `,
        [nombre, enumValue],
      );
    }

    // 7. drop enum column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "role"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."users_role_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "permiso_modulos"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}