import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliticaRetencion } from './entities/politica-retencion.entity';
import { AuditLog } from '../audit/entity/audit-log.entity';
import { Lote } from '../lote/entities/lote.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { Empresa } from '../empresa/entities/empresa.entity';
import { PoliticaRetencionRepository } from './repository/politica-retencion.repository';
import { POLITICA_RETENCION_REPOSITORY } from './repository/politica-retencion.repository.interface';
import { PoliticaRetencionService } from './politica-retencion.service';
import { RetentionGuardService } from './retention-guard.service';
import { RetencionArchivadoService } from './retencion-archivado.service';
import { RetencionArchivadoJob } from './retencion-archivado.job';
import { RetencionController } from './retencion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PoliticaRetencion,
      AuditLog,
      Lote,
      MedicionManualLote,
      SensorLectura,
      Empresa,
    ]),
  ],
  controllers: [RetencionController],
  providers: [
    PoliticaRetencionService,
    RetentionGuardService,
    RetencionArchivadoService,
    RetencionArchivadoJob,
    {
      provide: POLITICA_RETENCION_REPOSITORY,
      useClass: PoliticaRetencionRepository,
    },
  ],
  // Exportado para que cualquier módulo que agregue un delete a futuro
  // (lote, medicion-manual, lectura-sensor, audit) pueda inyectar el guard.
  exports: [PoliticaRetencionService, RetentionGuardService],
})
export class RetencionModule {}