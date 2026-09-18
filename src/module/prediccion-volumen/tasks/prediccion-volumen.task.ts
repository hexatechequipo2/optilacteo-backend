import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrediccionVolumenService } from '../prediccion-volumen.service';
import { PrediccionVolumenRepository } from '../repository/prediccion-volumen.repository';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

const MATERIAS_PRIMAS_SOPORTADAS = [
  TipoMateriaPrima.LECHE_CRUDA,
  TipoMateriaPrima.CREMA_DE_LECHE,
  TipoMateriaPrima.MASA_HILADA,
];

@Injectable()
export class PrediccionVolumenTask {
  private readonly logger = new Logger(PrediccionVolumenTask.name);

  constructor(
    private readonly prediccionVolumenService: PrediccionVolumenService,
    private readonly prediccionVolumenRepository: PrediccionVolumenRepository,
  ) {}

  // HU-51 criterio 6: actualización automática diaria.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ejecutar(): Promise<void> {
    this.logger.log('Iniciando generación diaria de predicciones de volumen.');

    for (const materiaPrima of MATERIAS_PRIMAS_SOPORTADAS) {
      const empresas =
        await this.prediccionVolumenRepository.findEmpresasConDatos(materiaPrima);

      for (const empresaId of empresas) {
        try {
          await this.prediccionVolumenService.generarYPersistir(
            empresaId,
            materiaPrima,
          );
        } catch (err) {
          this.logger.error(
            `Error al generar predicción para empresa ${empresaId}, ` +
              `materia prima ${materiaPrima}: ${err}`,
          );
        }
      }
    }

    this.logger.log('Generación diaria de predicciones de volumen finalizada.');
  }
}