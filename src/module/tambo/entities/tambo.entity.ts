import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Lote } from '../../lote/entities/lote.entity';

@Entity('tambos')
export class Tambo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ubicacion!: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  // Igual que en Proveedor y Lote: empresaId propio para poder filtrar
  // por tenant directamente, sin depender de un join a proveedor.
  @Column({ type: 'int', name: 'empresa_id' })
  empresaId!: number;

  @Column({ type: 'int', name: 'proveedor_id' })
  proveedorId!: number;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.tambos, {
    nullable: false,
    onDelete: 'RESTRICT', // no se puede borrar un proveedor con tambos asociados
  })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor!: Proveedor;

  @OneToMany(() => Lote, (lote) => lote.tambo)
  lotes!: Lote[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
