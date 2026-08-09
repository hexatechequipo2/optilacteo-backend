import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { LoteParametro } from './lote-parametro.entity';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { Ubicacion } from '../../sensor/enums/ubicacion.enum';
import { UnidadRendimiento } from '../enums/unidad-rendimiento.enum';

@Entity('lotes')
export class Lote {
  @PrimaryGeneratedColumn()
  id!: number;

  // Identificador único requerido por HU-60 (criterio 1).
  @Column({ unique: true })
  codigo!: string;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa, (empresa) => empresa.lotes)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;

  @Column()
  proveedorId!: number;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.lotes)
  @JoinColumn({ name: 'proveedorId' })
  proveedor!: Proveedor;

  @Column({ name: 'tipo_materia_prima', type: 'enum', enum: TipoMateriaPrima })
  materiaPrima!: TipoMateriaPrima;

  @Column({ type: 'timestamp' })
  fechaIngreso!: Date;

  @Column({ type: 'enum', enum: ClasificacionLote, nullable: true })
  clasificacion?: ClasificacionLote | null;

  @Column({ type: 'enum', enum: DestinoLote, nullable: true })
  destinoInicial?: DestinoLote | null;

  @Column({ type: 'enum', enum: EstadoLote, default: EstadoLote.REGISTRADO })
  estado!: EstadoLote;

  @OneToMany(() => LoteParametro, (parametro) => parametro.lote, {
    cascade: true,
    eager: true,
  })
  parametros!: LoteParametro[];

  @Column({ type: 'enum', enum: Ubicacion, nullable: true })
  ubicacionInicial?: Ubicacion | null;

  // HU-62: rendimiento obtenido al finalizar el lote. Opcional (AC2) —
  // se completa recién al cierre, por eso nullable y no se toca en create().
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rendimiento?: number | null;

  // HU-62 (extensión): unidad del valor de rendimiento cargado.
  @Column({ type: 'enum', enum: UnidadRendimiento, nullable: true })
  unidadRendimiento?: UnidadRendimiento | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
