import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

// HU-48: mínimo legal de retención (SENASA/CAA). Nunca configurable por
// debajo de este valor, ni siquiera por el administrador (AC4).
export const RETENCION_MESES_MINIMO = 24;

@Entity('politica_retencion')
@Unique(['empresaId'])
export class PoliticaRetencion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'empresa_id' })
  empresaId!: number;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({
    name: 'retencion_meses',
    type: 'int',
    default: RETENCION_MESES_MINIMO,
  })
  retencionMeses!: number;

  // Ventana de aviso (AC3/AC4): cuántos días antes del vencimiento se
  // considera un registro "próximo a vencer" en GET /retencion/proximos-a-vencer.
  @Column({ name: 'dias_aviso_vencimiento', type: 'int', default: 30 })
  diasAvisoVencimiento!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}