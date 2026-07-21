import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Plan } from '../enums/plan.enum';
import { EmpresaModulo } from './empresa-modulo.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  cuit!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ nullable: true })
  direccion?: string;

  @Column({ type: 'enum', enum: Plan, default: Plan.STARTER })
  plan!: Plan;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true })
  logoPath?: string | null;

  @OneToMany(() => User, (user) => user.empresa)
  users!: User[];

  @OneToMany(() => EmpresaModulo, (modulo) => modulo.empresa)
  modulos!: EmpresaModulo[];

  @OneToMany(() => Proveedor, (proveedor) => proveedor.empresa)
  proveedores!: Proveedor[];

  @OneToMany(() => ConfiguracionParametro, (config) => config.empresa)
  configuracionParametros!: ConfiguracionParametro[];
}