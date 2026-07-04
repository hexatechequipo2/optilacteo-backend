import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { Rol } from '../../rol/entities/rol.entity';

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
}