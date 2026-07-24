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
import { TipoEvento } from '../enums/tipo-evento.enum';

@Entity('sensor_eventos')
export class SensorEvento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TipoEvento })
  tipoEvento!: TipoEvento;

  // Nullable: si el sensor_id recibido no existe, no hay Sensor al cual apuntar.
  @Column({ type: 'int', nullable: true })
  sensorId?: number | null;

  @ManyToOne(() => Sensor, { nullable: true })
  @JoinColumn({ name: 'sensorId' })
  sensor?: Sensor | null;

  // Valor crudo del payload, para trazar qué mandó el PLC cuando no matchea ningún sensor.
  @Column({ type: 'varchar', nullable: true })
  sensorIdRecibido?: string | null;

  @Column({ type: 'int', nullable: true })
  loteId?: number | null;

  @ManyToOne(() => Lote, { nullable: true })
  @JoinColumn({ name: 'loteId' })
  lote?: Lote | null;

  @Column({ type: 'varchar', nullable: true })
  loteIdRecibido?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valorRecibido?: number | null;

  @Index()
  @Column()
  empresaId!: number;

  @Column({ type: 'jsonb', nullable: true })
  detalle?: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
