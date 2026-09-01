import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfiguracionNotificacionNivel1786442717753 implements MigrationInterface {
  name = 'AddConfiguracionNotificacionNivel1786442717753';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "configuracion_notificacion_nivel" (
            "id" SERIAL PRIMARY KEY,
            "nivel_alerta" "public"."notificaciones_nivel_alerta_enum" NOT NULL,
            "rolId" integer NOT NULL,
            "empresaId" integer NOT NULL,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_config_notif_empresa_nivel_rol" UNIQUE ("empresaId", "nivel_alerta", "rolId"),
            CONSTRAINT "FK_config_notif_rol" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_config_notif_empresa" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE
        )
        `);

    await queryRunner.query(`
        CREATE INDEX "IDX_config_notif_empresa_nivel"
        ON "configuracion_notificacion_nivel" ("empresaId", "nivel_alerta")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "configuracion_notificacion_nivel"`);
  }
}
