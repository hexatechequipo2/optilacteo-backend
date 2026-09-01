import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

// HU-68: lote de producción. Es el "destino" al que se asocia el consumo
// parcial de uno o varios lotes de ingreso de materia prima. A propósito
// minimalista — sin SKU ni más campos: eso queda fuera del alcance de esta
// HU (ver discusión con el equipo, posible HU futura).
@Entity('lote_produccion')
export class LoteProduccion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column({ unique: false })
  codigo!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
