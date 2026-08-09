import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyParametrosUtilizados1785260328856 implements MigrationInterface {
  name = 'SimplifyParametrosUtilizados1785260328856';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // No hay cambios de esquema, solo documentamos que la columna sigue siendo jsonb
    // Podrías limpiar datos viejos si querés:
    // UPDATE lote_clasificacion_historial SET parametrosUtilizados =
    //   jsonb_agg(jsonb_build_object('parametro', elem->>'parametro', 'valor', elem->>'valor'))
    // FROM jsonb_array_elements(parametrosUtilizados) elem;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nada que revertir, sigue siendo jsonb
  }
}
