import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './module/user/entities/user.entity';
import { Empresa } from './module/empresa/entities/empresa.entity';
import { EmpresaModulo } from './module/empresa/entities/empresa-modulo.entity';
import { RevokedToken } from './module/auth/entities/revoked-token.entity';
import { RefreshToken } from './module/auth/entities/refresh-token.entity';
import { PasswordResetTokenEntity } from './module/auth/entities/password-reset-token.entity';
import { Proveedor } from './module/proveedores/entities/proveedor.entity';
import { SystemConfig } from './module/system-config/entities/system-config.entity';
import { Rol } from './module/rol/entities/rol.entity';
import { PermisoModulo } from './module/permiso/entities/permiso-modulo.entity';
import { AuditLog } from './module/audit/entity/audit-log.entity';
import { ConfiguracionParametro } from './module/config-parametro/entities/config-parametro.entity';
import { Lote } from './module/lote/entities/lote.entity';
import { LoteParametro } from './module/lote/entities/lote-parametro.entity';
import { LoteProduccion } from './module/lote/entities/lote-produccion.entity';
import { LoteConsumo } from './module/lote/entities/lote-consumo.entity';
import { LoteConsumoParametro } from './module/lote/entities/lote-consumo-parametro.entity';
import { Sensor } from './module/sensor/entities/sensor.entity';
import { SensorLoteHistorial } from './module/sensor/entities/sensor-lote-historial.entity';
import { SensorLectura } from './module/lectura-sensor/entities/sensor-lectura.entity';
import { SensorEvento } from './module/lectura-sensor/entities/sensor-evento.entity';
import { Notificacion } from './module/notificaciones/entities/notificacion.entity';
import { LoteClasificacionHistorial } from './module/lote/entities/lote-clasificacion-historial.entity';
import { MedicionManualLote } from './module/medicion-manual/entities/medicion-manual-lote.entity';
import { Tambo } from './module/tambo/entities/tambo.entity';
import { RecomendacionDestino } from './module/ml/entities/recomendacion-destino.entity'; // <-- NUEVO (HU-49)
import { DestinoProductivo } from './module/destino-productivo/entities/destino-productivo.entity'; // <-- NUEVO (HU-34)
import { LoteDestinoHistorial } from './module/lote/entities/lote-destino-historial.entity';
import { ConfiguracionSilencioAlerta } from './module/notificaciones/entities/configuracion-silencio-alerta.entity';

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
    RefreshToken,
    PasswordResetTokenEntity,
    Proveedor,
    SystemConfig,
    Rol,
    PermisoModulo,
    AuditLog,
    ConfiguracionParametro,
    Lote,
    LoteParametro,
    LoteProduccion,
    LoteConsumo,
    LoteConsumoParametro,
    Sensor,
    SensorLoteHistorial,
    SensorLectura,
    SensorEvento,
    Notificacion,
    LoteClasificacionHistorial,
    MedicionManualLote,
    Tambo,
    RecomendacionDestino,
    DestinoProductivo,
    LoteDestinoHistorial,
    ConfiguracionSilencioAlerta
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});