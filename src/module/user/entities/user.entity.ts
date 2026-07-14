import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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

  @Column()
  password!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  lockedUntil!: Date | null;

  @ManyToOne(() => Empresa, (empresa) => empresa.users, { nullable: true })
  empresa?: Empresa | null;

  @ManyToOne(() => Rol, { nullable: true })
  @JoinColumn({ name: 'rol' })
  rol?: Rol | null;
}