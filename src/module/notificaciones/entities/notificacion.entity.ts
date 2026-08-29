import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { Lote } from '../../lote/entities/lote.entity';
import { Sensor } from '../../sensor/entities/sensor.entity';

@Entity('notificaciones')
@Index(['empresaId', 'usuarioId', 'leida'])
@Index(['empresaId', 'loteId', 'parametro', 'estado']) // HU-27: lookup de alertas abiertas
@Index(['empresaId', 'sensorId', 'tipo', 'estado']) // HU-31: lookup de alertas de desconexión abiertas
export class Notificacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo!: TipoNotificacion;

  @Column()
  mensaje!: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown> | null;

  /**
   * HU-25:
   * Nivel de severidad de la alerta.
   *
   * Nullable porque las notificaciones existentes
   * de otras HUs no necesariamente son alertas.
   */
  @Column({
    name: 'nivel_alerta',
    type: 'enum',
    enum: NivelAlerta,
    nullable: true,
  })
  nivelAlerta?: NivelAlerta | null;

  /**
   * HU-27:
   * Solo se completan para tipo = ALERTA_UMBRAL. Se usan para
   * detectar si ya hay una alerta abierta para el mismo lote+parámetro
   * y así evitar notificaciones duplicadas.
   */
  @Column({ name: 'lote_id', type: 'int', nullable: true })
  loteId?: number | null;

  @ManyToOne(() => Lote, { nullable: true })
  @JoinColumn({ name: 'lote_id' })
  lote?: Lote | null;

  @Column({ type: 'enum', enum: Parametro, nullable: true })
  parametro?: Parametro | null;

  /**
   * HU-31:
   * Solo se completa para tipo = ALERTA_SENSOR_DESCONECTADO. Se usa para
   * detectar si ya hay una alerta abierta para el mismo sensor y así
   * evitar notificaciones duplicadas mientras siga desconectado.
   */
  @Column({ name: 'sensor_id', type: 'int', nullable: true })
  sensorId?: number | null;

  @ManyToOne(() => Sensor, { nullable: true })
  @JoinColumn({ name: 'sensor_id' })
  sensor?: Sensor | null;

  /**
   * HU-27: ciclo de vida de la alerta.
   * Nullable porque no todas las notificaciones son alertas.
   */
  @Column({
    type: 'enum',
    enum: EstadoAlerta,
    nullable: true,
  })
  estado?: EstadoAlerta | null;

  @Column({ name: 'accion_correctiva', type: 'text', nullable: true })
  accionCorrectiva?: string | null;

  @Column({ name: 'resuelta_por_id', type: 'int', nullable: true })
  resueltaPorId?: number | null;

  @Column({ name: 'fecha_resolucion', type: 'timestamptz', nullable: true })
  fechaResolucion?: Date | null;

  @Column()
  usuarioId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: User;

  @Index()
  @Column()
  empresaId!: number;

  @Column({ default: false })
  leida!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
