import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { PermisoModulo } from '../../permiso/entities/permiso-modulo.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { User } from '../../user/entities/user.entity';

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

  // ATENCIÓN: PermisoModulo ahora tiene empresaId (multi-tenant). Esta
  // relación NO filtra por empresa -- si se carga (eager o con
  // `relations: { permisos: true }`), trae las filas de TODAS las
  // empresas para este rol. Para leer los permisos de una empresa
  // puntual, usar IPermisoRepository.findByRolYEmpresa(rolId, empresaId)
  // en vez de esta relación. Se mantiene solo por si algún flujo de alta
  // de rol la necesita para cascade de creación inicial.
  @OneToMany(() => PermisoModulo, (permiso) => permiso.rol, { cascade: true })
  permisos!: PermisoModulo[];

  @ManyToOne(() => Empresa, { nullable: true })
  empresa?: Empresa;

  // 👇 relación inversa hacia User
  @OneToMany(() => User, (user) => user.rol)
  users!: User[];
}