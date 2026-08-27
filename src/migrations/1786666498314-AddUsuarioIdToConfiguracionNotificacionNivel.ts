import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsuarioIdToConfiguracionNotificacionNivel1786666498314 implements MigrationInterface {
    name = 'AddUsuarioIdToConfiguracionNotificacionNivel1786666498314'

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ALTER COLUMN "rolId" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ADD COLUMN "usuarioId" integer NULL
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ADD CONSTRAINT "FK_config_notif_usuario"
          FOREIGN KEY ("usuarioId") REFERENCES users(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        DROP CONSTRAINT "UQ_config_notif_empresa_nivel_rol"
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ADD CONSTRAINT "UQ_config_notif_empresa_nivel_rol_usuario"
          UNIQUE ("empresaId", nivel_alerta, "rolId", "usuarioId")
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ADD CONSTRAINT "CHK_config_notif_al_menos_uno"
          CHECK ("rolId" IS NOT NULL OR "usuarioId" IS NOT NULL)
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ADD CONSTRAINT "CHK_config_notif_exclusivo"
          CHECK (NOT ("rolId" IS NOT NULL AND "usuarioId" IS NOT NULL))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        DROP CONSTRAINT "CHK_config_notif_exclusivo"
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        DROP CONSTRAINT "CHK_config_notif_al_menos_uno"
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        DROP CONSTRAINT "UQ_config_notif_empresa_nivel_rol_usuario"
    `);

    await queryRunner.query(`
      DELETE FROM configuracion_notificacion_nivel WHERE "rolId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ADD CONSTRAINT "UQ_config_notif_empresa_nivel_rol"
          UNIQUE ("empresaId", nivel_alerta, "rolId")
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        DROP CONSTRAINT "FK_config_notif_usuario"
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        DROP COLUMN "usuarioId"
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_notificacion_nivel
        ALTER COLUMN "rolId" SET NOT NULL
    `);
  }
}
