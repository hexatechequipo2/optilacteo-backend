import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Lote } from '../../lote/entities/lote.entity';
import { User } from '../../user/entities/user.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

// HU-20: registro manual de parámetros de un lote. Tabla independiente de
// sensor_lecturas a propósito — ese módulo ya está integrado al frontend y
// no queremos arriesgar romperlo. El origen "manual" es implícito: si la
// fila existe acá, es porque fue ingreso manual (criterio 4).
@Entity('mediciones_manuales_lote')
@Index(['empresaId', 'loteId', 'createdAt'])
export class MedicionManualLote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteId!: number;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote!: Lote;

  // Tipo de materia prima seleccionado al momento de la carga (criterio 9:
  // puede diferir del lote.materiaPrima original si el operario lo cambió
  // antes de guardar).
  @Column({ name: 'tipo_materia_prima', type: 'enum', enum: TipoMateriaPrima })
  tipoMateriaPrima!: TipoMateriaPrima;

  @Column({ type: 'enum', enum: Parametro })
  parametro!: Parametro;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor!: number;

  @Index()
  @Column()
  empresaId!: number;

  @Column()
  usuarioId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: User;

  // Criterio 12: fecha/hora automática del ingreso.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
