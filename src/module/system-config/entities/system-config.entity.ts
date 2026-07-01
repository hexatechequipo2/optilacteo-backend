import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'inactivity_timeout', default: 30 })
  inactivityTimeout!: number; // tiempo en minutos

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
