import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Check,
} from 'typeorm';
import { Rol } from '../../rol/entities/rol.entity';
import { User } from '../../user/entities/user.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

/**
 * HU-26 + HU-29:
 * Define quién recibe notificaciones de qué nivel de alerta, por empresa.
 * Cada fila es UN destinatario, asignado de una de dos formas (excluyentes):
 *  - rolId seteado, usuarioId null -> todos los usuarios activos con ese rol (HU-26)
 *  - usuarioId seteado, rolId null -> ese usuario puntual (HU-29)
 * Sin ninguna fila para un (empresaId, nivelAlerta) => nadie lo recibe.
 */
@Entity('configuracion_notificacion_nivel')
@Unique(['empresaId', 'nivelAlerta', 'rolId', 'usuarioId'])
@Check(`"rolId" IS NOT NULL OR "usuarioId" IS NOT NULL`)
@Check(`NOT ("rolId" IS NOT NULL AND "usuarioId" IS NOT NULL)`)
export class ConfiguracionNotificacionNivel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nivel_alerta', type: 'enum', enum: NivelAlerta })
  nivelAlerta!: NivelAlerta;

  @Column({ nullable: true })
  rolId?: number | null;

  @ManyToOne(() => Rol, { nullable: true })
  @JoinColumn({ name: 'rolId' })
  rol?: Rol | null;

  @Column({ nullable: true })
  usuarioId?: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuarioId' })
  usuario?: User | null;

  @Column()
  empresaId!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}