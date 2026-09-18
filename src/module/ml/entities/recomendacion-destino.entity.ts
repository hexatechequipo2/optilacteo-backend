import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lote } from '../../lote/entities/lote.entity';
import { LoteConsumo } from '../../lote/entities/lote-consumo.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { DestinoProductivo } from '../../destino-productivo/entities/destino-productivo.entity';

export type EstadoRecomendacion = 'pendiente' | 'aceptada' | 'rechazada';

@Entity('recomendaciones_destino')
export class RecomendacionDestino {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Lote)
  lote!: Lote;

  @ManyToOne(() => Empresa)
  empresa!: Empresa;

  // HU-68: si la recomendación vino de un consumo posterior (no del alta
  // original del lote), queda registrado acá cuál. Null cuando es la
  // recomendación generada al registrar el lote de materia prima.
  @Column({ nullable: true })
  loteConsumoId?: number | null;

  @ManyToOne(() => LoteConsumo, { nullable: true })
  loteConsumo?: LoteConsumo | null;

  // HU-49/HU-34: destino productivo real (tabla destinos_productivos,
  // configurable por empresa), no el enum de lotes.destinoInicial que se
  // usaba antes por error.
  @Column()
  destinoRecomendadoId!: number;

  @ManyToOne(() => DestinoProductivo)
  destinoRecomendado!: DestinoProductivo;

  @Column('float')
  confianza!: number;

  @Column({ default: 'pendiente' })
  estado!: EstadoRecomendacion;

  @Column({ nullable: true })
  destinoRealId?: number | null;

  @ManyToOne(() => DestinoProductivo, { nullable: true })
  destinoReal?: DestinoProductivo | null;

  // --- NUEVO (HU-37): justificación de divergencia operador vs sistema ---

  // Obligatoria (validada en el DTO) cuando el operador elige un destino
  // distinto al recomendado, es decir, cuando estado pasa a 'rechazada'.
  @Column({ type: 'text', nullable: true })
  justificacion?: string | null;

  // Usuario que respondió la recomendación (aceptó o rechazó). No existe
  // FK a una entidad Usuario en este módulo todavía, se guarda el id crudo
  // igual que en LoteRevisionCalidad.
  @Column({ type: 'int', nullable: true })
  usuarioId?: number | null;

  // Timestamp de la respuesta del operador, distinto de createdAt (que es
  // cuándo el sistema generó la recomendación).
  @Column({ type: 'timestamp', nullable: true })
  respondidaEn?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}