import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { Lote } from '../../lote/entities/lote.entity';

@Entity('sensor_lecturas')
export class SensorLectura {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  sensorId!: number;

  @ManyToOne(() => Sensor)
  @JoinColumn({ name: 'sensorId' })
  sensor!: Sensor;

  @Column()
  loteId!: number;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote!: Lote;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor!: number;

  // Timestamp que reporta el PLC/simulador (puede diferir del momento real de recepción).
  @Column({ type: 'timestamptz' })
  timestampLectura!: Date;

  @Index()
  @Column()
  empresaId!: number;

  // Momento real de recepción en el servidor.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
