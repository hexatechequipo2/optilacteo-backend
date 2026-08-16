import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Lote } from './lote.entity';
import { LoteProduccion } from './lote-produccion.entity';
import { LoteConsumoParametro } from './lote-consumo-parametro.entity';
import { User } from '../../user/entities/user.entity';

// HU-68: registro append-only de cada consumo parcial de un lote de
// ingreso de materia prima contra un lote de producción. Mismo patrón que
// SensorLoteHistorial: nunca se actualiza ni se borra, solo se inserta.
// Esto es lo que da la trazabilidad del criterio 4 (qué consumos parciales
// provienen del mismo lote de ingreso original).
@Entity('lote_consumo')
export class LoteConsumo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  loteIngresoId!: number;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteIngresoId' })
  loteIngreso!: Lote;

  @Column()
  loteProduccionId!: number;

  @ManyToOne(() => LoteProduccion)
  @JoinColumn({ name: 'loteProduccionId' })
  loteProduccion!: LoteProduccion;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad!: number;

  @Column()
  empresaId!: number;

  @Column()
  usuarioId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: User;

  @OneToMany(() => LoteConsumoParametro, (p) => p.loteConsumo, {
    cascade: true,
    eager: true,
  })
  parametros!: LoteConsumoParametro[];

  @CreateDateColumn()
  createdAt!: Date;
}