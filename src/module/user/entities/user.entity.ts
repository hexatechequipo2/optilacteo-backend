import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Role } from '../enums/role.enum';
import { Empresa } from '../../empresa/entities/empresa.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: Role, default: Role.ADMIN })
  role!: Role;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Empresa, (empresa) => empresa.users)
  empresa!: Empresa;
}
