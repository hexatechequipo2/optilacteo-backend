import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './module/user/entities/user.entity';
import { Empresa } from './module/empresa/entities/empresa.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Empresa],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});