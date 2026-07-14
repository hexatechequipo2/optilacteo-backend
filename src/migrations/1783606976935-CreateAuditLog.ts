import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateAuditLog1783606976935 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'audit_log',
                columns: [
                    { name: 'id', type: 'serial', isPrimary: true },
                    // Cambiado a isNullable: true para permitir logs de intentos de login fallidos (anónimos)
                    { name: 'userId', type: 'int', isNullable: true }, 
                    { name: 'userEmail', type: 'varchar', isNullable: false },
                    { name: 'empresaId', type: 'int', isNullable: true },
                    { name: 'accion', type: 'varchar', isNullable: false },
                    { name: 'entidad', type: 'varchar', isNullable: false },
                    { name: 'entidadId', type: 'int', isNullable: true },
                    { name: 'detalle', type: 'jsonb', isNullable: true },
                    { 
                        name: 'createdAt', 
                        type: 'timestamptz', 
                        isNullable: false, 
                        default: 'now()' 
                    },
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            'audit_log',
            new TableIndex({
                name: 'IDX_audit_log_empresa_created',
                columnNames: ['empresaId', 'createdAt'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('audit_log', 'IDX_audit_log_empresa_created');
        await queryRunner.dropTable('audit_log');
    }
}