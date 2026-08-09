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
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';

// HU-21 (AC3 + AC7 + AC11): registro histórico e inmutable de cada
// clasificación automática. Lote.clasificacion guarda solo el estado
// VIGENTE; esta tabla preserva la trazabilidad completa (si se re-clasifica
// un lote, la fila anterior no se borra ni se pisa, se agrega una nueva).
@Entity('lote_clasificacion_historial')
@Index(['empresaId', 'loteId', 'createdAt'])
export class LoteClasificacionHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteId!: number;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote!: Lote;

  @Column({ type: 'enum', enum: ClasificacionLote })
  clasificacion!: ClasificacionLote;

  // Snapshot de los valores usados para ESTA clasificación puntual.
  @Column({ type: 'jsonb' })
  parametrosUtilizados!: {
    parametro: string;
    valor: number;
  }[];

  @Index()
  @Column()
  empresaId!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
