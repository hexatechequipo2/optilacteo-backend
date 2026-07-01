import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Empresa } from './empresa.entity';
import { ModuloSistema } from '../enums/modulo-sistema.enum';

@Entity('empresa_modulos')
export class EmpresaModulo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: ModuloSistema })
  modulo!: ModuloSistema;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Empresa, (empresa) => empresa.modulos)
  empresa!: Empresa;
}