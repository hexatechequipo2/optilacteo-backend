import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lote } from '../../lote/entities/lote.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { DestinoLote } from '../../lote/enums/destino-lote.enum';

export type EstadoRecomendacion = 'pendiente' | 'aceptada' | 'rechazada';

@Entity('recomendaciones_destino')
export class RecomendacionDestino {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Lote)
  lote!: Lote;

  @ManyToOne(() => Empresa)
  empresa!: Empresa;

  @Column({ type: 'enum', enum: DestinoLote })
  destinoRecomendado!: DestinoLote;

  @Column('float')
  confianza!: number;

  @Column({ default: 'pendiente' })
  estado!: EstadoRecomendacion;

  @Column({ type: 'enum', enum: DestinoLote, nullable: true })
  destinoReal?: DestinoLote;

  @CreateDateColumn()
  createdAt!: Date;
}
