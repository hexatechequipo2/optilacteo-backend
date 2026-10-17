import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { Notificacion } from '../../notificaciones/entities/notificacion.entity';
import { TipoNotificacion } from '../../notificaciones/enums/tipo-notificacion.enum';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { RecomendacionDestino } from '../../ml/entities/recomendacion-destino.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { Sensor } from '../../sensor/entities/sensor.entity';
import type {
  IDemoRepository,
  LecturaDemo,
  LoteDemo,
} from './demo.repository.interface';

const TIPOS_ALERTA = [
  TipoNotificacion.ALERTA_UMBRAL,
  TipoNotificacion.ALERTA_ANOMALIA,
];

@Injectable()
export class DemoRepository implements IDemoRepository {
  constructor(
    @InjectRepository(SensorLectura)
    private readonly lecturaRepo: Repository<SensorLectura>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepo: Repository<ConfiguracionParametro>,
    @InjectRepository(RecomendacionDestino)
    private readonly recomendacionRepo: Repository<RecomendacionDestino>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
  ) {}

  async findLecturasDeLotes(
    loteIds: number[],
    empresaId: number,
  ): Promise<LecturaDemo[]> {
    if (loteIds.length === 0) return [];

    const filas = await this.lecturaRepo
      .createQueryBuilder('lectura')
      .innerJoin('lectura.sensor', 'sensor')
      .select('lectura.loteId', 'loteId')
      .addSelect('sensor.parametro', 'parametro')
      .addSelect('lectura.valor', 'valor')
      .addSelect('lectura.timestampLectura', 'timestampLectura')
      .where('lectura.loteId IN (:...loteIds)', { loteIds })
      .andWhere('lectura.empresaId = :empresaId', { empresaId })
      .orderBy('lectura.timestampLectura', 'ASC')
      .addOrderBy('lectura.id', 'ASC')
      .getRawMany<{
        loteId: number;
        parametro: Parametro;
        valor: string;
        timestampLectura: Date;
      }>();

    // decimal llega como string desde pg.
    return filas.map((f) => ({
      loteId: Number(f.loteId),
      parametro: f.parametro,
      valor: Number(f.valor),
      timestampLectura: new Date(f.timestampLectura),
    }));
  }

  findLotes(loteIds: number[], empresaId: number): Promise<LoteDemo[]> {
    if (loteIds.length === 0) return Promise.resolve([]);

    // Sin la relación eager `parametros`: el tablero no la usa.
    return this.loteRepo.find({
      select: {
        id: true,
        codigo: true,
        clasificacion: true,
        materiaPrima: true,
      },
      where: { id: In(loteIds), empresaId },
      loadEagerRelations: false,
    });
  }

  findUmbrales(
    empresaId: number,
    materiaPrima: TipoMateriaPrima,
  ): Promise<ConfiguracionParametro[]> {
    return this.configParametroRepo.find({
      where: { empresaId, tipoMateriaPrima: materiaPrima },
    });
  }

  async contarAlertasPorLote(
    loteIds: number[],
    empresaId: number,
  ): Promise<Map<number, number>> {
    if (loteIds.length === 0) return new Map();

    // Las filas de una misma alerta (una por destinatario) comparten tipo,
    // parámetro y mensaje; las de umbral además el data.timestamp de la
    // lectura que la disparó, que distingue dos alertas con igual mensaje.
    const filas = await this.notificacionRepo
      .createQueryBuilder('n')
      .select('n.loteId', 'loteId')
      .addSelect(
        `COUNT(DISTINCT CONCAT(n.tipo, '|', n.parametro, '|', n.mensaje, '|', COALESCE(n.data->>'timestamp', '')))`,
        'total',
      )
      .where('n.loteId IN (:...loteIds)', { loteIds })
      .andWhere('n.empresaId = :empresaId', { empresaId })
      .andWhere('n.tipo IN (:...tipos)', { tipos: TIPOS_ALERTA })
      .groupBy('n.loteId')
      .getRawMany<{ loteId: number; total: string }>();

    return new Map(filas.map((f) => [Number(f.loteId), Number(f.total)]));
  }

  findRecomendacionPosteriorA(
    loteId: number,
    empresaId: number,
    desde: Date,
  ): Promise<RecomendacionDestino | null> {
    return this.recomendacionRepo.findOne({
      where: {
        lote: { id: loteId },
        empresa: { id: empresaId },
        loteConsumoId: IsNull(),
        createdAt: MoreThan(desde),
      },
      relations: { destinoRecomendado: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Un solo UPDATE ... WHERE id AND empresaId AND nombre = esperado: si dos
  // turnos compiten por el mismo sensor, Postgres serializa las dos filas y
  // al segundo ya no le coincide el nombre (0 filas afectadas).
  async reemplazarNombreSensor(
    sensorId: number,
    empresaId: number,
    nombreEsperado: string,
    nombreNuevo: string,
  ): Promise<boolean> {
    const resultado = await this.sensorRepo.update(
      { id: sensorId, empresaId, nombre: nombreEsperado },
      { nombre: nombreNuevo },
    );
    return (resultado.affected ?? 0) > 0;
  }
}
