import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lote } from './entities/lote.entity';
import { LoteParametro } from './entities/lote-parametro.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { LoteController } from './lote.controller';
import { LoteService } from './lote.service';
import { LoteRepository } from './repository/lote.repository';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';
import { SensorModule } from '../sensor/sensor.module';
import { LOTE_UBICACION_HISTORIAL_REPOSITORY } from './repository/lote-ubicacion-historial.repository.interface';
import { LoteUbicacionHistorialRepository } from './repository/lote-ubicacion-historial.repository';
import { LoteUbicacionHistorial } from './entities/lote-ubicacion-historial.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { User } from '../user/entities/user.entity';
import { ClasificacionLoteService } from './clasificacion-lote.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { LoteClasificacionHistorial } from './entities/lote-clasificacion-historial.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { LoteRevisionCalidad } from './entities/lote-revision-calidad.entity';
import { ConfigParametroModule } from '../config-parametro/config-parametro.module';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      LoteParametro,
      Proveedor,
      LoteUbicacionHistorial,
      ConfiguracionParametro,
      SensorLectura,
      Sensor,
      MedicionManualLote,
      User,
      LoteClasificacionHistorial,
      LoteRevisionCalidad,
    ]),
    forwardRef(() => SensorModule),
    NotificacionesModule,
    ConfigParametroModule,
    AuditLogModule,
  ],
  controllers: [LoteController],
  providers: [
    LoteService,
    ClasificacionLoteService,
    {
      provide: LOTE_REPOSITORY,
      useClass: LoteRepository,
    },
    {
      provide: LOTE_UBICACION_HISTORIAL_REPOSITORY,
      useClass: LoteUbicacionHistorialRepository,
    },
  ],
  exports: [LoteService, LOTE_REPOSITORY, LOTE_UBICACION_HISTORIAL_REPOSITORY, ClasificacionLoteService],
})
export class LoteModule {}