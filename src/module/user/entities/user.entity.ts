import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Rol } from '../../rol/entities/rol.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;
  
  @Column({ select: false })
  password!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  lockedUntil!: Date | null;

  @ManyToOne(() => Empresa, (empresa) => empresa.users, { nullable: true })
  empresa?: Empresa | null;

  // 👇 Aquí la corrección: columna rolId + relación clara
  @Column({ name: 'rolId', nullable: true })
  rolId?: number | null;

  @ManyToOne(() => Rol, (rol) => rol.users, { nullable: true })
  @JoinColumn({ name: 'rolId' })
  rol?: Rol | null;
}