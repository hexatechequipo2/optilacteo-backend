import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DestinoProductivo } from './entities/destino-productivo.entity';
import { DestinoProductivoController } from './destino-productivo.controller';
import { DestinoProductivoService } from './destino-productivo.service';

// HU-49: no existía hasta ahora — la entidad se registraba vía
// TypeOrmModule.forFeature en MlModule/InternalModule porque nada más la
// necesitaba. Este módulo agrega el primer controller de destinos
// productivos; MlModule/InternalModule siguen registrando la entidad por su
// cuenta (no dependen de este módulo).
@Module({
  imports: [TypeOrmModule.forFeature([DestinoProductivo])],
  controllers: [DestinoProductivoController],
  providers: [DestinoProductivoService],
  exports: [DestinoProductivoService],
})
export class DestinoProductivoModule {}
