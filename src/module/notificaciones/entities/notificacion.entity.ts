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

@Entity('notificaciones')
@Index(['empresaId', 'usuarioId', 'leida'])
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