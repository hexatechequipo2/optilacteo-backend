import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Rol } from '../../rol/entities/rol.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

/**
 * HU-26:
 * Define qué rol recibe notificaciones de qué nivel de alerta, por empresa.
 * Sin fila configurada para un (empresaId, nivelAlerta) => nadie lo recibe
 * (ver NotificacionesService.obtenerDestinatariosPorNivel).
 */
@Entity('configuracion_notificacion_nivel')
@Unique(['empresaId', 'nivelAlerta', 'rolId'])
export class ConfiguracionNotificacionNivel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nivel_alerta', type: 'enum', enum: NivelAlerta })
  nivelAlerta!: NivelAlerta;

  @Column()
  rolId!: number;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rolId' })
  rol!: Rol;

  @Column()
  empresaId!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}