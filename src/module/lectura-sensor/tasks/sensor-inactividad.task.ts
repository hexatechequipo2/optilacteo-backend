import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ISensorRepository } from '../../sensor/repository/sensor.repository.interface';
import { SENSOR_REPOSITORY } from '../../sensor/repository/sensor.repository.interface';
import type { ISensorEventoRepository } from '../repository/sensor-evento.repository.interface';
import { SENSOR_EVENTO_REPOSITORY } from '../repository/sensor-evento.repository.interface';
import type { ISensorInactividadRepository } from '../repository/sensor-inactividad.repository.interface';
import { SENSOR_INACTIVIDAD_REPOSITORY } from '../repository/sensor-inactividad.repository.interface';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { SensorEvento } from '../entities/sensor-evento.entity';
import { TipoEvento } from '../enums/tipo-evento.enum';
import { LecturasGateway } from '../gateway/lecturas.gateway';

const UMBRAL_DEFAULT_MINUTOS = 5;

@Injectable()
export class SensorInactividadTask {
  private readonly logger = new Logger(SensorInactividadTask.name);

  constructor(
    @Inject(SENSOR_INACTIVIDAD_REPOSITORY)
    private readonly inactividadRepository: ISensorInactividadRepository,
    @Inject(SENSOR_REPOSITORY)
    private readonly sensorRepository: ISensorRepository,
    @Inject(SENSOR_EVENTO_REPOSITORY)
    private readonly eventoRepository: ISensorEventoRepository,
    private readonly lecturasGateway: LecturasGateway,
    private readonly configService: ConfigService,
  ) {}

  // Cruza todas las empresas a propósito: un cron no tiene TenantContext de
  // un request, es el único punto legítimo de acceso cross-tenant del
  // sistema (análogo al alcance global de un Administrador). Cada
  // actualización/evento se sigue escribiendo con su propio empresaId.
  @Cron(CronExpression.EVERY_MINUTE)
  async detectarInactividad(): Promise<void> {
    const umbralMinutos = this.resolveUmbralMinutos();
    const cutoff = new Date(Date.now() - umbralMinutos * 60_000);

    const sensoresInactivos =
      await this.inactividadRepository.findSensoresInactivos(cutoff);

    for (const sensor of sensoresInactivos) {
      sensor.estado = EstadoSensor.INACTIVO;
      await this.sensorRepository.save(sensor);

      const evento = new SensorEvento();
      evento.tipoEvento = TipoEvento.SENSOR_INACTIVO;
      evento.empresaId = sensor.empresaId;
      evento.sensorId = sensor.id;
      await this.eventoRepository.create(evento);

     this.lecturasGateway.emitirSensorInactivo(
      { sensorId: sensor.id, nombre: sensor.nombre },
      sensor.empresaId,
    );

      this.logger.warn(
        `Sensor "${sensor.nombre}" (empresa ${sensor.empresaId}) marcado como falla por inactividad (> ${umbralMinutos} min sin reportar).`,
      );
    }
  }

  private resolveUmbralMinutos(): number {
    const raw = this.configService.get<string>(
      'SENSOR_INACTIVIDAD_UMBRAL_MINUTOS',
    );
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : UMBRAL_DEFAULT_MINUTOS;
  }
}
