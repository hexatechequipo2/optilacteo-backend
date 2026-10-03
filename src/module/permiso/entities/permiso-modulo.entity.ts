// module/permiso/entities/permiso-modulo.entity.ts
import {
  Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from '../../rol/entities/rol.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { TODOS_LOS_MODULOS_PERMISO } from '../enums/modulo-administrativo.enum';
import type { ModuloPermiso } from '../enums/modulo-administrativo.enum';

@Entity('permiso_modulos')
@Index('UQ_permiso_empresa_rol_modulo', ['empresaId', 'rol', 'modulo'], { unique: true })
export class PermisoModulo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: TODOS_LOS_MODULOS_PERMISO,
    enumName: 'permiso_modulos_modulo_enum',
  })
  modulo!: ModuloPermiso;

  @Column({ default: false }) canRead!: boolean;

  // DEPRECADO: se elimina en la migración 2.
  @Column({ default: false }) canWrite!: boolean;

  @Column({ default: false }) canCreate!: boolean;
  @Column({ default: false }) canUpdate!: boolean;
  @Column({ default: false }) canDelete!: boolean;
  @Column({ default: false }) canExport!: boolean;

  @ManyToOne(() => Rol, (rol) => rol.permisos, { onDelete: 'CASCADE' })
  rol!: Rol;

  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;
}