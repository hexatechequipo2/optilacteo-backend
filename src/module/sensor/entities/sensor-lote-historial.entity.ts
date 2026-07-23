import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Sensor } from './sensor.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { User } from '../../user/entities/user.entity';

@Entity('sensor_lote_historial')
export class SensorLoteHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  sensorId!: number;

  @ManyToOne(() => Sensor)
  @JoinColumn({ name: 'sensorId' })
  sensor!: Sensor;

  // Lote del que se desasocia. Null si es la primera asociación del sensor.
  @Column({ nullable: true })
  loteIdAnterior?: number | null;

  @ManyToOne(() => Lote, { nullable: true })
  @JoinColumn({ name: 'loteIdAnterior' })
  loteAnterior?: Lote | null;

  // Lote al que se asocia. Esta es la ÚNICA fuente de verdad del estado actual.
  @Column()
  loteIdNuevo!: number;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteIdNuevo' })
  loteNuevo!: Lote;

  @Column()
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  usuario!: User;

  @Column()
  empresaId!: number;

  @CreateDateColumn()
  fecha!: Date;
}