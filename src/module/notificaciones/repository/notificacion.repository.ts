import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notificacion } from '../entities/notificacion.entity';
import { INotificacionRepository } from './notificacion.repository.interface';

import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { HistorialAlertasQueryDto } from '../dto/historial-alertas-query.dto';

import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

@Injectable()
export class NotificacionRepository
  implements INotificacionRepository
{
  constructor(
    @InjectRepository(Notificacion)
    private readonly repository: Repository<Notificacion>,
  ) {}

  create(
    notificacion: Partial<Notificacion>,
  ): Promise<Notificacion> {
    const entity =
      this.repository.create(notificacion);

    return this.repository.save(entity);
  }

  findByUsuario(
    usuarioId: number,
    empresaId: number,
    query: NotificacionFilterQueryDto,
  ): Promise<[Notificacion[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.repository.findAndCount({
      where: {
        usuarioId,
        empresaId,
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findById(
    id: number,
    empresaId: number,
  ): Promise<Notificacion | null> {
    return this.repository.findOne({
      where: {
        id,
        empresaId,
      },
    });
  }

  async markAsLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<Notificacion | null> {
    const result =
      await this.repository.update(
        {
          id,
          usuarioId,
          empresaId,
        },
        {
          leida: true,
        },
      );

    if (!result.affected) {
      return null;
    }

    return this.repository.findOne({
      where: {
        id,
        usuarioId,
        empresaId,
      },
    });
  }

  countNoLeidas(
    usuarioId: number,
    empresaId: number,
  ): Promise<number> {
    return this.repository.count({
      where: {
        usuarioId,
        empresaId,
        leida: false,
      },
    });
  }

  // ============================================================
  // HU-27
  // ============================================================

  findAlertaAbiertaPorLoteYParametro(
    empresaId: number,
    loteId: number,
    parametro: Parametro,
  ): Promise<Notificacion | null> {
    return this.repository.findOne({
      where: {
        empresaId,
        loteId,
        parametro,
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        estado: EstadoAlerta.ABIERTA,
      },
    });
  }

  async resolver(
    id: number,
    empresaId: number,
    accionCorrectiva: string,
    resueltaPorId: number,
  ): Promise<Notificacion | null> {
    const result =
      await this.repository.update(
        {
          id,
          empresaId,
          tipo: TipoNotificacion.ALERTA_UMBRAL,
          estado: EstadoAlerta.ABIERTA,
        },
        {
          estado: EstadoAlerta.CERRADA,
          accionCorrectiva,
          resueltaPorId,
          fechaResolucion: new Date(),
        },
      );

    if (!result.affected) {
      return null;
    }

    return this.repository.findOne({
      where: {
        id,
        empresaId,
      },
      relations: {
        lote: true,
      },
    });
  }

  // ============================================================
  // HU-27 + HU-28
  // ============================================================

  async findHistorial(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<[Notificacion[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb =
      this.crearQueryHistorial(
        empresaId,
        query,
      );

    qb.skip((page - 1) * limit);
    qb.take(limit);

    return qb.getManyAndCount();
  }

  // ============================================================
  // HU-28
  // Exportación sin paginación
  // ============================================================

  async findHistorialCompleto(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<Notificacion[]> {
    const qb = this.crearQueryHistorial(
      empresaId,
      query,
    );

    const alertas = await qb.getMany();

    console.log(
      'ALERTAS OBTENIDAS PARA EXPORTAR:',
      alertas.map((alerta) => ({
        id: alerta.id,
        estado: alerta.estado,
        nivel: alerta.nivelAlerta,
        loteId: alerta.loteId,
      })),
    );

    return alertas;
  }

  // ============================================================
  // Query común HU-28
  // ============================================================

  private crearQueryHistorial(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ) 
  {
    console.log('FILTROS RECIBIDOS:', query);
    const qb = this.repository
      .createQueryBuilder('notificacion')
      .leftJoinAndSelect(
        'notificacion.lote',
        'lote',
      )
      .where(
        'notificacion.empresaId = :empresaId',
        {
          empresaId,
        },
      )
      qb.andWhere('notificacion.tipo IN (:...tipos)', {
        tipos: [
          TipoNotificacion.ALERTA_UMBRAL,
          TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
        ],
      });


    if (query.estado) {
      qb.andWhere(
        'notificacion.estado = :estado',
        {
          estado: query.estado,
        },
      );
    }

    if (query.loteId !== undefined) {
      qb.andWhere(
        'notificacion.loteId = :loteId',
        {
          loteId: query.loteId,
        },
      );
    }

    if (query.nivelAlerta) {
      qb.andWhere(
        'notificacion.nivelAlerta = :nivelAlerta',
        {
          nivelAlerta: query.nivelAlerta,
        },
      );
    }

    if (query.fechaInicio) {
      qb.andWhere(
        'notificacion.createdAt >= :fechaInicio',
        {
          fechaInicio: new Date(
            query.fechaInicio,
          ),
        },
      );
    }

    if (query.fechaFin) {
      const fechaFin =
        this.normalizarFechaFin(
          query.fechaFin,
        );

      qb.andWhere(
        'notificacion.createdAt <= :fechaFin',
        {
          fechaFin,
        },
      );
    }

    qb.orderBy(
      'notificacion.createdAt',
      'DESC',
    );
    console.log('SQL:', qb.getSql());
    console.log('PARAMETROS:', qb.getParameters());
    return qb;
  }

  private normalizarFechaFin(
    fechaFin: string,
  ): Date {
    const fecha = new Date(fechaFin);

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        fechaFin,
      )
    ) {
      fecha.setUTCHours(
        23,
        59,
        59,
        999,
      );
    }

    return fecha;
  }

   findAlertaAbiertaPorSensor(
    empresaId: number,
    sensorId: number,
    tipo: TipoNotificacion,
  ): Promise<Notificacion | null> {
    return this.repository.findOne({
      where: {
        empresaId,
        sensorId,
        tipo,
        estado: EstadoAlerta.ABIERTA,
      },
    });
  }

  async cerrarAlertasAbiertasPorSensor(
    empresaId: number,
    sensorId: number,
    tipo: TipoNotificacion,
  ): Promise<void> {
    await this.repository.update(
      {
        empresaId,
        sensorId,
        tipo,
        estado: EstadoAlerta.ABIERTA,
      },
      {
        estado: EstadoAlerta.CERRADA,
        fechaResolucion: new Date(),
      },
    );
  }
}