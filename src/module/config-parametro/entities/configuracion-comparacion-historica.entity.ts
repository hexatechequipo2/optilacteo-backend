import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

@Entity('configuracion_comparacion_historica')
@Unique(['empresaId'])
export class ConfiguracionComparacionHistorica {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'empresa_id' })
  empresaId!: number;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ name: 'desvio_significativo_porcentaje', type: 'decimal', precision: 5, scale: 2, default: 15 })
  desvioSignificativoPorcentaje!: number;

  @Column({ name: 'cantidad_registros_historicos', type: 'int', default: 20 })
  cantidadRegistrosHistoricos!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}