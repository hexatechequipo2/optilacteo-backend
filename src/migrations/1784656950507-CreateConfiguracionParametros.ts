import { MigrationInterface, QueryRunner, Table, TableUnique, TableForeignKey } from 'typeorm';

export class CreateConfiguracionParametros1721580000000 implements MigrationInterface {
  name = 'CreateConfiguracionParametros1721580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'configuracion_parametros',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'empresa_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'parametro',
            type: 'enum',
            enum: ['ph', 'temperatura', 'densidad', 'grasa', 'proteina', 'acidez', 'conductividad'],
            enumName: 'configuracion_parametros_parametro_enum',
            isNullable: false,
          },
          {
            name: 'tipo_materia_prima',
            type: 'enum',
            enum: ['leche_cruda', 'crema_de_leche', 'masa_hilada'],
            enumName: 'configuracion_parametros_tipo_materia_prima_enum',
            isNullable: false,
          },
          {
            name: 'umbral_min',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'umbral_max',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'configuracion_parametros',
      new TableUnique({
        name: 'UQ_config_parametro_empresa_parametro_materia',
        columnNames: ['empresa_id', 'parametro', 'tipo_materia_prima'],
      }),
    );

    await queryRunner.createForeignKey(
      'configuracion_parametros',
      new TableForeignKey({
        name: 'FK_config_parametro_empresa',
        columnNames: ['empresa_id'],
        referencedTableName: 'empresas',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('configuracion_parametros', 'FK_config_parametro_empresa');
    await queryRunner.dropUniqueConstraint('configuracion_parametros', 'UQ_config_parametro_empresa_parametro_materia');
    await queryRunner.dropTable('configuracion_parametros');
  }
}