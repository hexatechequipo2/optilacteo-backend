import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Sku } from './sku.entity';
import { Lote } from './lote.entity';

@Entity('ingresos_camara')
export class IngresoCamara {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column()
  skuId!: number;

  @ManyToOne(() => Sku)
  @JoinColumn({ name: 'skuId' })
  sku!: Sku;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad!: number;

  // "Sin referencia" en el prototipo -> nullable.
  @Column({ nullable: true })
  loteId?: number | null;

  @ManyToOne(() => Lote, { nullable: true })
  @JoinColumn({ name: 'loteId' })
  lote?: Lote | null;

  @Column({ type: 'timestamp' })
  fechaIngreso!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}