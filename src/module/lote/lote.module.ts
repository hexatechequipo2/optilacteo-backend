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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      LoteParametro,
      Proveedor,
      LoteUbicacionHistorial,
      ConfiguracionParametro,
    ]),
    forwardRef(() => SensorModule),
  ],
  controllers: [LoteController],
  providers: [
    LoteService,
    {
      provide: LOTE_REPOSITORY,
      useClass: LoteRepository,
    },
    { provide: LOTE_UBICACION_HISTORIAL_REPOSITORY, 
      useClass: LoteUbicacionHistorialRepository },

  ],
  exports: [LoteService, LOTE_REPOSITORY, LOTE_UBICACION_HISTORIAL_REPOSITORY],
})
export class LoteModule {}