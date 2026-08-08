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
import { User } from '../../user/entities/user.entity';
import { OrigenLectura } from '../enums/origen-lectura.enum';

@Entity('sensor_lecturas')
// HU-19: el historial filtra siempre por empresaId + rango de timestamp, y
// opcionalmente por loteId. Este índice cubre el patrón de consulta sin
// necesitar un índice separado por loteId (queda como prefijo cubierto por
// el índice individual que ya crea la FK, pero se agrega igual por si el
// planner prefiere combinarlo).
@Index(['empresaId', 'timestampLectura'])
@Index(['empresaId', 'loteId', 'timestampLectura'])
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

  // Timestamp que reporta el PLC/simulador (puede diferir del momento real de
  // recepción). Para HU-15, en un ingreso manual coincide con el momento de
  // carga (no hay un "timestamp de dispositivo" distinto que reportar).
  @Column({ type: 'timestamptz' })
  timestampLectura!: Date;

  @Index()
  @Column()
  empresaId!: number;

  // HU-15: distingue una lectura real del sensor de un ingreso manual de
  // fallback. SENSOR es el default para no romper los registros existentes.
  @Column({ type: 'enum', enum: OrigenLectura, default: OrigenLectura.SENSOR })
  origen!: OrigenLectura;

  // Usuario que cargó el valor manualmente. Null para lecturas de sensor real.
  @Column({ type: 'int', nullable: true })
  usuarioId?: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuarioId' })
  usuario?: User | null;

  // Momento real de recepción en el servidor.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}