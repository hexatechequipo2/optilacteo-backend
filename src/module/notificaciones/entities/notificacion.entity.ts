import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';

// HU-21 (AC4): notificación al Responsable de Calidad ante un lote No Apto
// o En Revisión. Se persiste (consulta posterior vía endpoint) y se emite
// en tiempo real por WebSocket.
@Entity('notificaciones')
@Index(['empresaId', 'usuarioId', 'leida'])
export class Notificacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo!: TipoNotificacion;

  @Column()
  mensaje!: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown> | null;

  @Column()
  usuarioId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: User;

  @Index()
  @Column()
  empresaId!: number;

  @Column({ default: false })
  leida!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
