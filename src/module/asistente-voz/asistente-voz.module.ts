import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import { LoteModule } from '../lote/lote.module';
import { AsistenteVozController } from './asistente-voz.controller';
import { AsistenteVozService } from './asistente-voz.service';
import { DictadoParametrosParserService } from './parser/dictado-parametros-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConfiguracionParametro]),
    forwardRef(() => LoteModule),
  ],
  controllers: [AsistenteVozController],
  providers: [AsistenteVozService, DictadoParametrosParserService],
  exports: [AsistenteVozService, DictadoParametrosParserService],
})
export class AsistenteVozModule {}
