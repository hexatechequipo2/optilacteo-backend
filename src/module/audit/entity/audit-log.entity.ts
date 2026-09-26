import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TipoAccion } from '../enums/tipo-accion.enum';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  userId!: number | null;

  @Column()
  userEmail!: string;

  @Column({ type: 'varchar', nullable: true })
  userNombre!: string | null;

  @Column({ type: 'varchar', nullable: true })
  userRol!: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  empresaId!: number | null;

  @Column()
  accion!: string;

  @Column()
  entidad!: string;

  @Column({ type: 'int', nullable: true })
  entidadId!: number | null;

  @Index()
  @Column({ type: 'varchar' })
  tipo!: TipoAccion;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detalle!: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}