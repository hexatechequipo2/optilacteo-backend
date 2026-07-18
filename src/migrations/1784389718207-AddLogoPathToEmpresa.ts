import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLogoPathToEmpresa1737234567890 implements MigrationInterface {
  name = 'AddLogoPathToEmpresa1737234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'empresas',
      new TableColumn({
        name: 'logoPath',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('empresas', 'logoPath');
  }
}