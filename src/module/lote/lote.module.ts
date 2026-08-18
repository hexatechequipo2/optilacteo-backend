import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lote } from './entities/lote.entity';
import { LoteParametro } from './entities/lote-parametro.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Tambo } from '../tambo/entities/tambo.entity'; // <-- NUEVO (HU-36)
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

// HU-67: catálogo de SKU e ingreso a cámara de producto terminado
import { Sku } from './entities/sku.entity';
import { IngresoCamara } from './entities/ingreso-camara.entity';
import { SkuService } from './sku.service';
import { SkuController } from './sku.controller';
import { SkuRepository } from './repository/sku.repository';
import { SKU_REPOSITORY } from './repository/sku-repository.interface';
import { IngresoCamaraService } from './ingreso-camara.service';
import { IngresoCamaraController } from './ingreso-camara.controller';
import { IngresoCamaraRepository } from './repository/ingreso-camara.repository';
import { INGRESO_CAMARA_REPOSITORY } from './repository/ingreso-camara-repository.interface';
import { LoteProduccion } from './entities/lote-produccion.entity';
import { LoteConsumo } from './entities/lote-consumo.entity';
import { LoteConsumoParametro } from './entities/lote-consumo-parametro.entity';
import { LoteConsumoService } from './lote-consumo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      LoteParametro,
      Proveedor,
      Tambo, // <-- NUEVO (HU-36)
      LoteUbicacionHistorial,
      ConfiguracionParametro,
      SensorLectura,
      Sensor,
      MedicionManualLote,
      User,
      LoteClasificacionHistorial,
      LoteRevisionCalidad,
      Sku,
      IngresoCamara,
      LoteProduccion,
      LoteConsumo,
      LoteConsumoParametro,
    ]),
    forwardRef(() => SensorModule),
    NotificacionesModule,
    ConfigParametroModule,
    AuditLogModule,
  ],
  controllers: [LoteController, SkuController, IngresoCamaraController],
  providers: [
    LoteService,
    ClasificacionLoteService,
    LoteConsumoService,
    {
      provide: LOTE_REPOSITORY,
      useClass: LoteRepository,
    },
    {
      provide: LOTE_UBICACION_HISTORIAL_REPOSITORY,
      useClass: LoteUbicacionHistorialRepository,
    },
    SkuService,
    {
      provide: SKU_REPOSITORY,
      useClass: SkuRepository,
    },
    IngresoCamaraService,
    {
      provide: INGRESO_CAMARA_REPOSITORY,
      useClass: IngresoCamaraRepository,
    },
  ],
  exports: [
    LoteService,
    LOTE_REPOSITORY,
    LOTE_UBICACION_HISTORIAL_REPOSITORY,
    ClasificacionLoteService,
    SkuService,
    SKU_REPOSITORY,
  ],
})
export class LoteModule {}