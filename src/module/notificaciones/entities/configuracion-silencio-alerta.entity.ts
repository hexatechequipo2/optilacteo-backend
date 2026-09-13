import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

/**
 * HU-30:
 * Horario en el que las alertas de nivel INFORMATIVA no generan
 * notificación push (se siguen registrando, solo se silencia el envío).
 * Una empresa puede tener múltiples horarios configurados a la vez
 * (ej. turno nocturno + fin de semana).
 */
@Entity('configuracion_silencio_alerta')
@Index(['empresaId'])
export class ConfiguracionSilencioAlerta {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'empresa_id' })
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ type: 'varchar', nullable: true })
  nombre?: string | null;

  /**
   * Formato 'HH:mm'. Si horaFin < horaInicio, el horario cruza la
   * medianoche (ej. 22:00 -> 06:00).
   */
  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio!: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin!: string;

  /**
   * 0=domingo .. 6=sábado. null o [] = todos los días.
   */
  @Column({ name: 'dias_semana', type: 'int', array: true, nullable: true })
  diasSemana?: number[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}