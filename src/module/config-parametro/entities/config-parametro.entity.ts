import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';

@Entity('configuracion_parametros')
@Unique(['empresaId', 'parametro', 'tipoMateriaPrima'])
export class ConfiguracionParametro {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'empresa_id' })
  empresaId!: number;

  @ManyToOne(() => Empresa, (empresa) => empresa.configuracionParametros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ type: 'enum', enum: Parametro })
  parametro!: Parametro;

  @Column({ name: 'tipo_materia_prima', type: 'enum', enum: TipoMateriaPrima })
  tipoMateriaPrima!: TipoMateriaPrima;

  @Column({ name: 'umbral_min', type: 'decimal', precision: 10, scale: 2 })
  umbralMin!: number;

  @Column({ name: 'umbral_max', type: 'decimal', precision: 10, scale: 2 })
  umbralMax!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}