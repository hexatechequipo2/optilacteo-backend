import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  userId!: number | null;

  // Se denormaliza el email: si el usuario se desactiva o elimina más
  // adelante, el log de auditoría no debe perder la trazabilidad de quién
  // hizo la acción.
  @Column()
  userEmail!: string;

  @Index()
  @Column({ type: 'int', nullable: true })
  empresaId!: number | null;

  // Ej: 'PROVEEDOR_ELIMINAR', 'USUARIO_DESACTIVAR', 'ROL_MODIFICAR'
  @Column()
  accion!: string;

  // Ej: 'Proveedor', 'Usuario', 'Rol'
  @Column()
  entidad!: string;

  @Column({ type: 'int', nullable: true })
  entidadId!: number | null;

  // Contexto adicional opcional (ej: valores anteriores/nuevos en un update)
  @Column({ type: 'jsonb', nullable: true })
  detalle!: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}