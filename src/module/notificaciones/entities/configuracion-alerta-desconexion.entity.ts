import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

@Entity('configuracion_alerta_desconexion')
@Unique(['empresaId'])
export class ConfiguracionAlertaDesconexion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'empresa_id' })
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ name: 'umbral_minutos', type: 'int', default: 15 })
  umbralMinutos!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
