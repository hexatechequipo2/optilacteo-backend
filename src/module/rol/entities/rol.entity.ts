import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { PermisoModulo } from '../../permiso/entities/permiso-modulo.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column({ nullable: true })
  descripcion?: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => PermisoModulo, (permiso) => permiso.rol, { cascade: true })
  permisos!: PermisoModulo[];

  @ManyToOne(() => Empresa, { nullable: true })
  empresa?: Empresa;
}