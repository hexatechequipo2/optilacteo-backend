import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lote } from './entities/lote.entity';
import { LoteParametro } from './entities/lote-parametro.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { LoteController } from './lote.controller';
import { LoteService } from './lote.service';
import { LoteRepository } from './repository/lote.repository';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lote,
      LoteParametro,
      Proveedor,
      ConfiguracionParametro,
    ]),
  ],
  controllers: [LoteController],
  providers: [
    LoteService,
    {
      provide: LOTE_REPOSITORY,
      useClass: LoteRepository,
    },
  ],
  exports: [LoteService],
})
export class LoteModule {}