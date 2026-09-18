import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { Rol } from '../../rol/entities/rol.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';

@Entity('permiso_modulos')
export class PermisoModulo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: ModuloSistema })
  modulo!: ModuloSistema;

  @Column({ default: false })
  canRead!: boolean;

  @Column({ default: false })
  canWrite!: boolean;

  @ManyToOne(() => Rol, (rol) => rol.permisos, { onDelete: 'CASCADE' })
  rol!: Rol;

  // Multi-tenant: cada empresa configura sus propios permisos por rol,
  // sin afectar a las demás. rol sigue siendo catálogo global (los 5
  // roles son compartidos), pero la combinación (empresa, rol, módulo)
  // ahora es lo que define permisos+lectura/escritura.
  @Column()
  empresaId!: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresaId' })
  empresa!: Empresa;
}