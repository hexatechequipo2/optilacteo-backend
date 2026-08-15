import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRolUsersRelation1786760282916 implements MigrationInterface {
    name = 'AddRolUsersRelation1786760282916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // No hay cambios en la base, solo en la entidad
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Nada que revertir
    }
}
