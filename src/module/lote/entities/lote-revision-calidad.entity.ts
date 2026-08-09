import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Lote } from './lote.entity';
import { DecisionRevision } from '../enums/decision-revision.enum';
import { User } from '../../user/entities/user.entity';

// HU-22: registro histórico e inmutable de cada revisión manual sobre un
// lote No Apto. Igual que lote_clasificacion_historial, nunca se actualiza
// una fila existente: cada decisión (incluso una nueva revisión posterior
// a una reclasificación) genera un registro nuevo.
@Entity('lote_revision_calidad')
@Index(['empresaId', 'loteId', 'createdAt'])
export class LoteRevisionCalidad {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteId!: number;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote!: Lote;

  @Column({ type: 'enum', enum: DecisionRevision })
  decision!: DecisionRevision;

  @Column({ type: 'text' })
  justificacion!: string;

  @Column()
  usuarioId!: number;

  @Index()
  @Column()
  empresaId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
