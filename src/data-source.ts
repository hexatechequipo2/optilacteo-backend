import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './module/user/entities/user.entity';
import { Empresa } from './module/empresa/entities/empresa.entity';
import { EmpresaModulo } from './module/empresa/entities/empresa-modulo.entity';
import { RevokedToken } from './module/auth/entities/revoked-token.entity';
import { PasswordResetTokenEntity } from './module/auth/entities/password-reset-token.entity';
import { Proveedor } from './module/proveedores/entities/proveedor.entity';
import { SystemConfig } from './module/system-config/entities/system-config.entity';
import { Rol } from './module/rol/entities/rol.entity';
import { PermisoModulo } from './module/permiso/entities/permiso-modulo.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Empresa,
    EmpresaModulo,
    RevokedToken,
    PasswordResetTokenEntity,
    Proveedor,
    SystemConfig,
    Rol,
    PermisoModulo,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
