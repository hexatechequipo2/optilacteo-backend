import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lote } from './lote.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

@Entity('lote_parametros')
export class LoteParametro {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteId!: number;

  @ManyToOne(() => Lote, (lote) => lote.parametros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loteId' })
  lote!: Lote;

  @Column({ type: 'enum', enum: Parametro })
  parametro!: Parametro;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor!: number;
}