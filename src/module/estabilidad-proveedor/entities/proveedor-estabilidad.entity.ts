import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export interface DetalleEstabilidad {
  parametro: string;
  materiaPrima: string;
  n: number;
  media: number;
  desvio: number;
  desvioNormalizado: number;
  clasificacion: string;
}

@Entity('proveedor_estabilidad')
@Unique(['proveedorId'])
export class ProveedorEstabilidad {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  proveedorId!: number;

  @Column()
  empresaId!: number;

  @Column({ type: 'varchar' })
  status!: 'ok' | 'insufficient_data';

  @Column({ type: 'varchar', nullable: true })
  clasificacion!: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  score!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  detalle!: DetalleEstabilidad[];

  @Column({ type: 'int' })
  cantidadLotes!: number;

  @Column({ type: 'varchar', nullable: true })
  modeloVersion!: string | null;

  @UpdateDateColumn()
  calculadoEn!: Date;
}