import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { TipoSensor } from '../enums/tipo-sensor.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstadoSensor } from '../enums/estado-sensor.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

@Entity('sensores')
export class Sensor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column({ type: 'enum', enum: TipoSensor })
  tipo!: TipoSensor;

  @Column({ type: 'enum', enum: Parametro })
  parametro!: Parametro;

  @Column({ name: 'rango_min_favor', type: 'decimal', precision: 10, scale: 2 })
  rangoMinFavor!: number;

  @Column({ name: 'rango_max_favor', type: 'decimal', precision: 10, scale: 2 })
  rangoMaxFavor!: number;

  @Column({ type: 'enum', enum: EstadoSensor, default: EstadoSensor.ACTIVO })
  estado!: EstadoSensor;

  @Column({ type: 'timestamp', nullable: true })
  ultimaLectura?: Date | null;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa, (empresa) => empresa.sensores)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column({ type: 'enum', enum: Ubicacion })
  ubicacion!: Ubicacion;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}