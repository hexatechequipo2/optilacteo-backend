import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lote } from '../../lote/entities/lote.entity';
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

  @CreateDateColumn()
  createdAt!: Date;
}
