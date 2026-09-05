import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './module/user/user.module';
import { EmpresaModule } from './module/empresa/empresa.module';
import { AuthModule } from './module/auth/auth.module';
import { ProveedoresModule } from './module/proveedores/proveedor.module';
import { TamboModule } from './module/tambo/tambo.module'; // <-- NUEVO (HU-36)
import { SystemConfigModule } from './module/system-config/system-config.module';
import { RolModule } from './module/rol/rol.module';
import { PermisoModule } from './module/permiso/permiso.module';
import { AuditLogModule } from './module/audit/audit-log.module';
import { ConfigParametroModule } from './module/config-parametro/config-parametro.module';
import { LoteModule } from './module/lote/lote.module';
import { SensorModule } from './module/sensor/sensor.module';
import { PlcConfigModule } from './module/plc-config/plc-config.module'; // <-- NUEVO (HU-61)
import { LecturaSensorModule } from './module/lectura-sensor/lectura-sensor.module';
import { MedicionManualModule } from './module/medicion-manual/medicion-manual.module';
import { AsistenteVozModule } from './module/asistente-voz/asistente-voz.module'; // <-- NUEVO (HU-55, spike)
import { NotificacionesModule } from './module/notificaciones/notificaciones.module';
import { DashboardModule } from './module/dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { MlModule } from './module/ml/ml.module';
import { InternalModule } from './module/internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // ¡solo para desarrollo! ver nota abajo
      }),
    }),
    UserModule,
    EmpresaModule,
    AuthModule,
    ProveedoresModule,
    TamboModule,
    SystemConfigModule,
    RolModule,
    PermisoModule,
    AuditLogModule,
    ConfigParametroModule,
    LoteModule,
    SensorModule,
    PlcConfigModule,
    LecturaSensorModule,
    MedicionManualModule,
    AsistenteVozModule,
    NotificacionesModule,
    DashboardModule,
    HealthModule,
    MlModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
