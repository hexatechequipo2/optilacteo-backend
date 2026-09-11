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
import { Tambo } from '../../tambo/entities/tambo.entity'; // <-- NUEVO (HU-36)
import { LoteParametro } from './lote-parametro.entity';
import { DestinoProductivo } from '../../destino-productivo/entities/destino-productivo.entity'; // <-- NUEVO (HU-34)
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { Ubicacion } from '../../sensor/enums/ubicacion.enum';
import { UnidadRendimiento } from '../enums/unidad-rendimiento.enum';
import { UnidadCantidad } from '../enums/unidad-cantidad.enum';

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

  // --- NUEVO (HU-36): tambo de origen, obligatorio ---
  @Column()
  tamboId!: number;

  @ManyToOne(() => Tambo, (tambo) => tambo.lotes, { nullable: false })
  @JoinColumn({ name: 'tamboId' })
  tambo!: Tambo;

  @Column({ name: 'tipo_materia_prima', type: 'enum', enum: TipoMateriaPrima })
  materiaPrima!: TipoMateriaPrima;

  @Column({ type: 'timestamp' })
  fechaIngreso!: Date;

  @Column({ type: 'enum', enum: ClasificacionLote, nullable: true })
  clasificacion?: ClasificacionLote | null;

  @Column({ type: 'enum', enum: DestinoLote, nullable: true })
  destinoInicial?: DestinoLote | null;

  // HU-34: destino productivo real del lote (ej. "manteca", "queso
  // cremoso"), configurable por empresa vía tabla destinos_productivos.
  // Distinto de destinoInicial (arriba): ese es un enum fijo que representa
  // la ubicacion/tratamiento inicial del lote, no su destino productivo.
  // Ambos campos conviven.
  @Column({ nullable: true })
  destinoProductivoId?: number | null;

  @ManyToOne(() => DestinoProductivo, { nullable: true })
  @JoinColumn({ name: 'destinoProductivoId' })
  destinoProductivo?: DestinoProductivo | null;

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

  // HU-68: cantidad total ingresada y saldo remanente para consumo parcial.
  // Nullable: lotes registrados antes de HU-68 no tienen este dato y no
  // soportan consumo parcial hasta que se les cargue manualmente (fuera de
  // alcance de esta HU).
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cantidad?: number | null;

  // HU-51: unidad física de `cantidad`. Nullable por los mismos motivos que
  // `cantidad` (lotes previos a esta columna no la tienen) y porque se
  // infiere server-side a partir de `materiaPrima` en LoteService.create()
  // en vez de depender de que el cliente la envíe correctamente.
  @Column({
    name: 'unidad_cantidad',
    type: 'enum',
    enum: UnidadCantidad,
    nullable: true,
  })
  unidadCantidad?: UnidadCantidad | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cantidadDisponible?: number | null;

  // HU-69: número de remito del proveedor, obligatorio, vincula el lote a
  // su documentación de origen. Default temporal 'S/D' para lotes previos
  // a esta HU (ver migración) — a partir de acá siempre viene del DTO.
  @Column({ type: 'varchar' })
  numeroRemito!: string;
  
  // HU-66: cantidad comprometida según remito del proveedor. Opcional (AC4) —
  // puede no estar disponible al momento de la carga si aún no llegó el remito.
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cantidadComprometidaKg?: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}