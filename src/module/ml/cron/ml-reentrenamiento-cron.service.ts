import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Empresa } from '../../empresa/entities/empresa.entity';

interface EntrenamientoResponse {
  status: string;
  detail?: string;
  accuracy?: number;
  n_samples?: number;
}

@Injectable()
export class MlReentrenamientoCronService {
  private readonly logger = new Logger(MlReentrenamientoCronService.name);
  private readonly baseUrl =
    process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  // Evita que se solape una corrida con la siguiente — mismo patrón que
  // SensorDesconexionCronService.
  private ejecutando = false;

  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    private readonly http: HttpService,
  ) {}

  // 3am: horario de baja actividad esperado para una planta láctea.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async reentrenarModelos(): Promise<void> {
    if (this.ejecutando) {
      this.logger.warn(
        'La corrida anterior de reentrenarModelos todavía no terminó; se salta este tick.',
      );
      return;
    }

    this.ejecutando = true;

    try {
      const empresas = await this.empresaRepo.find({
        where: { isActive: true },
      });

      for (const empresa of empresas) {
        try {
          const response = await firstValueFrom(
            this.http.post<EntrenamientoResponse>(
              `${this.baseUrl}/train/destino/${empresa.id}`,
            ),
          );

          const resultado = response.data;

          if (resultado.status === 'ok') {
            this.logger.log(
              `Empresa ${empresa.id} (${empresa.name}): modelo reentrenado, accuracy=${resultado.accuracy}, n_samples=${resultado.n_samples}`,
            );
          } else {
            this.logger.warn(
              `Empresa ${empresa.id} (${empresa.name}): no se pudo reentrenar (${resultado.status}) — ${resultado.detail ?? 'sin detalle'}`,
            );
          }
        } catch (err) {
          // No dejamos que la falla de una empresa tumbe el resto de la
          // corrida — el microservicio puede estar caído, o esa empresa en
          // particular tener un error puntual.
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Empresa ${empresa.id} (${empresa.name}): error llamando al microservicio ML: ${message}`,
          );
        }
      }
    } finally {
      this.ejecutando = false;
    }
  }
}
