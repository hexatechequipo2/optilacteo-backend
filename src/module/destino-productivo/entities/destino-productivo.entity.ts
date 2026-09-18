import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

// HU-34: destino productivo configurable por empresa (ej. "manteca",
// "manteca pasteleria", o los distintos tipos de queso de otra planta).
// Es tabla y no enum porque cada empresa define los suyos.
//
// No confundir con Lote.destinoInicial (ver lote.entity.ts): ese es un enum
// fijo (produccion/almacenamiento/tratamiento/descarte) que representa la
// ubicacion o tratamiento inicial del lote. DestinoProductivo es el destino
// productivo real/final del lote y ambos conceptos conviven.
@Entity('destinos_productivos')
@Unique(['empresaId', 'nombre'])
export class DestinoProductivo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column()
  nombre!: string;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
