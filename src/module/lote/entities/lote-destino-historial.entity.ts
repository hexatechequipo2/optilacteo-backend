import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lote } from './lote.entity';
import { DestinoProductivo } from '../../destino-productivo/entities/destino-productivo.entity';

export type OrigenDestinoHistorial = 'manual' | 'recomendacion_ml';

// HU-34: historial UNIFICADO de asignaciones/cambios de destino productivo
// de un lote, sin importar si el cambio vino de una asignación manual
// (HU-34, PATCH /lotes/:id/destino-productivo) o de aceptar/rechazar una
// recomendación (HU-49/HU-37, PATCH recomendaciones/:id/responder). El
// detalle propio de la recomendación (confianza, justificación) sigue
// viviendo en RecomendacionDestino; acá solo queda el registro de "qué
// destino quedó vigente, cuándo y quién lo dejó así".
@Entity('lote_destino_historial')
export class LoteDestinoHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loteId!: number;

  @ManyToOne(() => Lote)
  lote!: Lote;

  @Column()
  empresaId!: number;

  @Column()
  destinoProductivoId!: number;

  @ManyToOne(() => DestinoProductivo)
  destinoProductivo!: DestinoProductivo;

  @Column({ nullable: true })
  destinoAnteriorId?: number | null;

  @ManyToOne(() => DestinoProductivo, { nullable: true })
  destinoAnterior?: DestinoProductivo | null;

  @Column({ type: 'int' })
  usuarioId!: number;

  @Column({ type: 'varchar' })
  origen!: OrigenDestinoHistorial;

  // Null cuando origen = 'manual'. Cuando origen = 'recomendacion_ml',
  // apunta a la RecomendacionDestino que originó este cambio.
  @Column({ type: 'int', nullable: true })
  recomendacionDestinoId?: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}