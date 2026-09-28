import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from '../empresa/entities/empresa.entity';
import { RetencionArchivadoService } from './retencion-archivado.service';

// AC3: corre automáticamente, sin intervención del administrador.
// Horario de bajo uso (3am); si falla una empresa no frena a las demás.
@Injectable()
export class RetencionArchivadoJob {
  private readonly logger = new Logger(RetencionArchivadoJob.name);

  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    private readonly archivadoService: RetencionArchivadoService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archivarTodasLasEmpresas(): Promise<void> {
    const empresas = await this.empresaRepo.find();

    for (const empresa of empresas) {
      try {
        await this.archivadoService.archivarVencidos(empresa.id);
      } catch (error) {
        this.logger.error(
          `Fallo el job de retención para empresa ${empresa.id}: ${
            (error as Error).message
          }`,
        );
      }
    }
  }
}