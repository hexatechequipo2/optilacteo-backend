import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { Lote } from '../lote/entities/lote.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { ProveedorEstabilidad } from './entities/proveedor-estabilidad.entity';

import { EstabilidadProveedorService } from './estabilidad-proveedor.service';
import { EstabilidadHttpClient } from './clients/estabilidad-http.client';
import { ESTABILIDAD_CLIENT } from './interfaces/estabilidad-client.interface';

import { EstabilidadProveedorController } from './estabilidad-proveedor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      ConfiguracionParametro,
      ProveedorEstabilidad,
    ]),
    HttpModule,
  ],

  controllers: [
    EstabilidadProveedorController,
  ],

  providers: [
    EstabilidadProveedorService,
    EstabilidadHttpClient,
    {
      provide: ESTABILIDAD_CLIENT,
      useExisting: EstabilidadHttpClient,
    },
  ],

  exports: [EstabilidadProveedorService],
})
export class EstabilidadProveedorModule {}