import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { LoteConsumo } from './lote-consumo.entity';

// HU-68 (criterio 3): parámetros de calidad exigidos al usar el remanente
// de un lote de ingreso en un consumo posterior al primero. Mismo patrón
// que LoteParametro, pero colgado del consumo puntual, no del lote.
@Entity('lote_consumo_parametro')
export class LoteConsumoParametro {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteConsumoId!: number;

  @ManyToOne(() => LoteConsumo, (consumo) => consumo.parametros, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'loteConsumoId' })
  loteConsumo!: LoteConsumo;

  // varchar a propósito, ver nota en la migración sobre el tipo enum de Postgres.
  @Column({ type: 'varchar' })
  parametro!: Parametro;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor!: number;
}
