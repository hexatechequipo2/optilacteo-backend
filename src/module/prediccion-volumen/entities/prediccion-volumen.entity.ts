import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { Empresa } from '../../empresa/entities/empresa.entity';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { UnidadCantidad } from '../../lote/enums/unidad-cantidad.enum';
import { StatusPrediccion } from '../enums/status-prediccion.enum';

export interface DiaPrediccion {
  fecha: string; // YYYY-MM-DD
  minimo: number;
  esperado: number;
  maximo: number;
}

@Entity('predicciones_volumen')
@Index(['empresaId', 'tipoMateriaPrima', 'fechaGeneracion'])
export class PrediccionVolumen {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column({ name: 'tipo_materia_prima', type: 'enum', enum: TipoMateriaPrima })
  tipoMateriaPrima!: TipoMateriaPrima;

  @Column({
    type: 'enum',
    enum: UnidadCantidad,
    enumName: 'lotes_unidad_cantidad_enum',
  })
  unidad!: UnidadCantidad;
  
  @Column({ name: 'fecha_generacion', type: 'timestamptz', default: () => 'now()' })
  fechaGeneracion!: Date;

  @Column({ name: 'modelo_version' })
  modeloVersion!: string;

  // 7 objetos {fecha, minimo, esperado, maximo}. Vacío si status es
  // insufficient_data.
  @Column({ type: 'jsonb' })
  dias!: DiaPrediccion[];

  @Column({ type: 'varchar', default: StatusPrediccion.OK })
  status!: StatusPrediccion;

  @CreateDateColumn()
  createdAt!: Date;
}