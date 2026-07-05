import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { Empresa } from '../../empresa/entities/empresa.entity';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'razon_social', length: 200 })
  razonSocial!: string;

  @Column({ type: 'varchar', length: 13, unique: true })
  cuit!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', name: 'email_contacto', length: 150, nullable: true })
  emailContacto!: string | null;

  @Column({ type: 'enum', enum: TipoProveedor, default: TipoProveedor.TAMBO })
  tipo!: TipoProveedor;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provincia!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  localidad!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacidad!: number | null;

  @Column({ type: 'enum', enum: EstadoProveedor, default: EstadoProveedor.ACTIVA })
  estado!: EstadoProveedor;

  @ManyToOne(() => Empresa, (empresa) => empresa.proveedores, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ type: 'int', name: 'empresa_id' })
  empresaId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}