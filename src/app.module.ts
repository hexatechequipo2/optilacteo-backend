import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './module/user/user.module';
import { EmpresaModule } from './module/empresa/empresa.module';
import { AuthModule } from './module/auth/auth.module';
import { ProveedoresModule } from './module/proveedores/proveedor.module';
import { SystemConfigModule } from './module/system-config/system-config.module';
import { RolModule } from './module/rol/rol.module';
import { PermisoModule } from './module/permiso/permiso.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '././module/audit/interceptor/audit-log.interceptor';
import { AuditLogModule } from './module/audit/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    SystemConfigModule,
    RolModule,
    PermisoModule,
    AuditLogModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR, 
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
