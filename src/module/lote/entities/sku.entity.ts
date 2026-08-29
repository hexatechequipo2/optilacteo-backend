import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { UnidadMedidaSku } from '../enums/unidad-medida-sku.enum';

@Entity('skus')
export class Sku {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column()
  nombre!: string;

  @Column({
    type: 'enum',
    enum: UnidadMedidaSku,
    default: UnidadMedidaSku.UNIDADES,
  })
  unidadMedida!: UnidadMedidaSku;

  // Soft-delete, consistente con el patrón de HU-65 (sensores).
  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
