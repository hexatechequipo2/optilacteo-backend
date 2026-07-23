import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Ubicacion } from '../../sensor/enums/ubicacion.enum';

@Entity('lote_ubicacion_historial')
export class LoteUbicacionHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteId!: number;

  @Column()
  sensorId!: number;

  @Column({ type: 'enum', enum: Ubicacion, nullable: true })
  ubicacionAnterior?: Ubicacion | null;

  @Column({ type: 'enum', enum: Ubicacion })
  ubicacionNueva!: Ubicacion;

  @Column()
  userId!: number;

  @Column()
  empresaId!: number;

  @CreateDateColumn()
  fecha!: Date;
}