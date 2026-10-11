
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lote } from './entities/lote.entity';
import { LoteParametro } from './entities/lote-parametro.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Tambo } from '../tambo/entities/tambo.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';

import { LoteController } from './lote.controller';
import { LoteService } from './lote.service';
import { LoteRepository } from './repository/lote.repository';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';

import { SensorModule } from '../sensor/sensor.module';
import {
  LOTE_UBICACION_HISTORIAL_REPOSITORY,
} from './repository/lote-ubicacion-historial.repository.interface';
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
import { LoteTrazabilidadService } from './lote-trazabilidad.service';

import { MlModule } from '../ml/ml.module';

// HU-34: historial unificado de destino productivo del lote
import { LoteDestinoHistorial } from './entities/lote-destino-historial.entity';
import { DestinoProductivo } from '../destino-productivo/entities/destino-productivo.entity';
import { TrazabilidadPdfBuilder } from './pdf/trazabilidad-pdf.builder';
import { Empresa } from '../empresa/entities/empresa.entity';

// HU-64: estabilidad de proveedores
import { EstabilidadProveedorModule } from '../estabilidad-proveedor/estabilidad-proveedor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      LoteParametro,
      Proveedor,
      Tambo,
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
      LoteDestinoHistorial,
      DestinoProductivo,
      Empresa,
    ]),

    forwardRef(() => SensorModule),
    NotificacionesModule,
    ConfigParametroModule,
    AuditLogModule,
    MlModule,

    // HU-64: importar el módulo que exporta EstabilidadProveedorService.
    EstabilidadProveedorModule,
  ],

  controllers: [
    LoteController,
    SkuController,
    IngresoCamaraController,
  ],

  providers: [
    LoteService,
    ClasificacionLoteService,
    LoteConsumoService,
    LoteTrazabilidadService,
    TrazabilidadPdfBuilder,

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