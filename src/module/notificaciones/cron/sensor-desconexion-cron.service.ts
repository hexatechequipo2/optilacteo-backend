import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { ConfiguracionAlertaDesconexionService } from '../configuracion-alerta-desconexion.service';
import { NotificacionesService } from '../notificaciones.service';

@Injectable()
export class SensorDesconexionCronService {
  private readonly logger = new Logger(SensorDesconexionCronService.name);

  // HU-31: evita que se solapen dos corridas del cron si una ejecución
  // tarda más de 1 minuto en completar (con muchos sensores, o si la DB
  // responde lento). Sin esto, @Cron dispara la siguiente corrida igual,
  // en paralelo, y eso puede generar alertas duplicadas para el mismo
  // sensor si ambas corridas evalúan "no hay alerta abierta todavía"
  // antes de que la primera termine de insertar.
  private ejecutando = false;

  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    private readonly configService: ConfiguracionAlertaDesconexionService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async verificarDesconexiones(): Promise<void> {
    if (this.ejecutando) {
      this.logger.warn(
        'La corrida anterior de verificarDesconexiones todavía no terminó; se salta este tick.',
      );
      return;
    }

    this.ejecutando = true;

    try {
      const sensores = await this.sensorRepo.find({
        where: { estado: EstadoSensor.ACTIVO },
      });

      const cacheUmbralEmpresa = new Map<number, number>();
      const ahora = Date.now();

      for (const sensor of sensores) {
        const umbral =
          sensor.umbralDesconexionMinutos ??
          (await this.umbralEmpresa(sensor.empresaId, cacheUmbralEmpresa));

        const referencia = sensor.ultimaLectura ?? sensor.createdAt;
        const minutosSinDatos = Math.floor(
          (ahora - referencia.getTime()) / 60000,
        );

        if (minutosSinDatos >= umbral) {
          // Se espera cada alerta antes de pasar al siguiente sensor
          // (en vez de fire-and-forget con .catch()) para procesar
          // de forma secuencial y predecible, evitando llamadas
          // concurrentes acumuladas dentro de la misma corrida.
          try {
            await this.notificacionesService.generarAlertaSensorDesconectado({
              empresaId: sensor.empresaId,
              sensorId: sensor.id,
              sensorNombre: sensor.nombre,
              ultimaLectura: sensor.ultimaLectura ?? null,
              minutosSinDatos,
            });
          } catch (err) {
            this.logger.error(
              `Error al generar alerta de desconexión para sensor ${sensor.id}: ${err}`,
            );
          }
        }
      }
    } finally {
      this.ejecutando = false;
    }
  }

  private async umbralEmpresa(
    empresaId: number,
    cache: Map<number, number>,
  ): Promise<number> {
    if (cache.has(empresaId)) return cache.get(empresaId)!;
    const config = await this.configService.obtenerOCrear(empresaId);
    cache.set(empresaId, config.umbralMinutos);
    return config.umbralMinutos;
  }
}
