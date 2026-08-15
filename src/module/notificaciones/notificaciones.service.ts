import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { ROLES } from '../rol/constants/roles.constants';

import { NotificacionesGateway } from './gateway/notificaciones.gateway';

import { TipoNotificacion } from './enums/tipo-notificacion.enum';
import { NivelAlerta } from './enums/nivel-alerta.enum';

import { NotificacionResponseDto } from './dto/notificacion-response.dto';
import { NotificacionFilterQueryDto } from './dto/notificacion-filter-query.dto';
import { NotificacionPaginadaResponseDto } from './dto/notificacion-paginada-response.dto';

import {
  NotificacionMapper,
  CrearNotificacionParams,
} from './mappers/notificacion.mapper';

import type { INotificacionRepository } from './repository/notificacion.repository.interface';
import { NOTIFICACION_REPOSITORY } from './repository/notificacion.repository.interface';

import { TipoMateriaPrima } from '../config-parametro/enums/tipo-materia-prima-enum';

import { ConfiguracionNotificacionNivel } from './entities/configuracion-notificacion-nivel.entity';
import { CrearConfiguracionNotificacionDto } from './dto/crear-configuracion-notificacion.dto';

import type { IConfiguracionNotificacionRepository } from './repository/configuracion-notificacion-nivel.repository.interface';
import { CONFIGURACION_NOTIFICACION_REPOSITORY } from './repository/configuracion-notificacion-nivel.repository.interface';

import { HistorialAlertasQueryDto } from './dto/historial-alertas-query.dto';
import { EstadoAlerta } from './enums/estado-alerta.enum';
import { ResolverAlertaDto } from './dto/resolver-alerta.dto';
import { Parametro } from '../config-parametro/enums/parametro.enum';

import PDFDocument from 'pdfkit';

@Injectable()
export class NotificacionesService {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY)
    private readonly notificacionRepository: INotificacionRepository,

    @Inject(CONFIGURACION_NOTIFICACION_REPOSITORY)
    private readonly configuracionRepository: IConfiguracionNotificacionRepository,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly gateway: NotificacionesGateway,
  ) {}

  async notificarResponsablesCalidad(
    empresaId: number,
    tipo: TipoNotificacion,
    mensaje: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const responsables = await this.userRepository.find({
      where: {
        empresa: {
          id: empresaId,
        },
        rol: {
          nombre: ROLES.RESPONSABLE_CALIDAD,
        },
        isActive: true,
      },
      relations: {
        rol: true,
        empresa: true,
      },
    });

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
      });

      const creada = await this.notificacionRepository.create(entity);

      this.gateway.emitirNotificacion(
        NotificacionMapper.toResponse(creada),
        empresaId,
        usuario.id,
      );
    }
  }

  async generarAlertaPorUmbral(params: {
    empresaId: number;
    loteId: number;
    loteCodigo: string;
    parametro: Parametro;
    materiaPrima: TipoMateriaPrima;
    valor: number;
    umbralMin: number;
    umbralMax: number;
    timestamp?: Date;
  }): Promise<NotificacionResponseDto[]> {
    const {
      empresaId,
      loteId,
      loteCodigo,
      parametro,
      materiaPrima,
      valor,
      umbralMin,
      umbralMax,
      timestamp,
    } = params;

    const fueraDeRango = valor < umbralMin || valor > umbralMax;

    if (!fueraDeRango) {
      return [];
    }

    /**
     * HU-27:
     * Si ya existe una alerta abierta para el mismo
     * lote + parámetro, no se genera otra.
     */
    const alertaAbiertaExistente =
      await this.notificacionRepository.findAlertaAbiertaPorLoteYParametro(
        empresaId,
        loteId,
        parametro,
      );

    if (alertaAbiertaExistente) {
      return [];
    }

    const desvioPorcentaje = this.calcularDesvioPorcentaje(
      valor,
      umbralMin,
      umbralMax,
    );

    const nivelAlerta = this.determinarNivelAlerta(desvioPorcentaje);
    console.log('NivelAlerta que se busca:', nivelAlerta);
    console.log('Buscando config con nivelAlerta:', nivelAlerta);
    const responsables = await this.obtenerDestinatariosPorNivel(
      empresaId,
      nivelAlerta,
    );

    const mensaje = this.construirMensajeAlerta({
      parametro,
      valor,
      umbralMin,
      umbralMax,
      loteCodigo,
      nivelAlerta,
    });

    const data: Record<string, unknown> = {
      loteId,
      loteCodigo,
      parametro,
      materiaPrima,
      valor,
      umbralMin,
      umbralMax,
      desvioPorcentaje,
      nivelAlerta,
      timestamp: (timestamp ?? new Date()).toISOString(),
    };

    const notificaciones: NotificacionResponseDto[] = [];

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
        nivelAlerta,
        loteId,
        parametro,
      });

      const creada = await this.notificacionRepository.create(entity);

      const response = NotificacionMapper.toResponse(creada);

      this.gateway.emitirNotificacion(
        response,
        empresaId,
        usuario.id,
      );

      notificaciones.push(response);
    }

    return notificaciones;
  }

  /**
   * HU-26 + HU-29:
   *
   * Combina destinatarios configurados:
   *
   * - por rol: todos los usuarios activos de la empresa con ese rol.
   * - por usuario: un usuario específico de la empresa.
   *
   * Si un usuario está configurado por rol y también individualmente,
   * se envía una sola notificación mediante deduplicación por ID.
   *
   * Si no existe ninguna configuración para el nivel de alerta,
   * no se notifica a nadie.
   */
  private async obtenerDestinatariosPorNivel(
    empresaId: number,
    nivelAlerta: NivelAlerta,
  ): Promise<User[]> {
    const { rolIds, usuarioIds } =
      await this.configuracionRepository.findDestinatariosConfigByNivel(
        empresaId,
        nivelAlerta,
      );

    console.log(
      'DEBUG obtenerDestinatariosPorNivel -> empresaId:', empresaId,
      'nivelAlerta:', nivelAlerta,
      'rolIds:', rolIds,
      'usuarioIds:', usuarioIds,
    ); // temporal

    if (rolIds.length === 0 && usuarioIds.length === 0) {
      return [];
    }

    const porRol = rolIds.length
      ? await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.rol', 'rol')
          .leftJoinAndSelect('user.empresa', 'empresa')
          .where('"user"."empresaId" = :empresaId', { empresaId })
          .andWhere('"user"."rolId" IN (:...rolIds)', { rolIds })
          .andWhere('"user"."isActive" = true')
          .getMany()
      : [];

    const porUsuarioDirecto = usuarioIds.length
      ? await this.userRepository.find({
          where: {
            id: In(usuarioIds),
            empresa: {
              id: empresaId,
            },
            isActive: true,
          },
          relations: {
            rol: true,
            empresa: true,
          },
        })
      : [];

    // HU-29:
    // Evita enviar dos notificaciones al mismo usuario
    // si coincide una configuración por rol y una individual.
    const mapa = new Map<number, User>();

    for (const usuario of [...porRol, ...porUsuarioDirecto]) {
      mapa.set(usuario.id, usuario);
    }

    return Array.from(mapa.values());
  }

  private calcularDesvioPorcentaje(
    valor: number,
    umbralMin: number,
    umbralMax: number,
  ): number {
    if (valor < umbralMin) {
      if (umbralMin === 0) {
        return 100;
      }

      return (
        ((umbralMin - valor) / Math.abs(umbralMin)) *
        100
      );
    }

    if (valor > umbralMax) {
      if (umbralMax === 0) {
        return 100;
      }

      return (
        ((valor - umbralMax) / Math.abs(umbralMax)) *
        100
      );
    }

    return 0;
  }

  private determinarNivelAlerta(
    desvioPorcentaje: number,
  ): NivelAlerta {
    if (desvioPorcentaje <= 5) {
      return NivelAlerta.INFORMATIVA;
    }

    if (desvioPorcentaje < 15) {
      return NivelAlerta.ADVERTENCIA;
    }

    return NivelAlerta.CRITICA;
  }

  private construirMensajeAlerta(params: {
    parametro: Parametro;
    valor: number;
    umbralMin: number;
    umbralMax: number;
    loteCodigo: string;
    nivelAlerta: NivelAlerta;
  }): string {
    const {
      parametro,
      valor,
      umbralMin,
      umbralMax,
      loteCodigo,
      nivelAlerta,
    } = params;

    return (
      `Alerta ${nivelAlerta}: el parámetro ${parametro} ` +
      `del lote ${loteCodigo} registró un valor de ${valor}, ` +
      `fuera del umbral permitido ` +
      `(${umbralMin} - ${umbralMax}).`
    );
  }

  async listarPorUsuario(
    usuarioId: number,
    empresaId: number,
    query: NotificacionFilterQueryDto,
  ): Promise<NotificacionPaginadaResponseDto> {
    const [notificaciones, total] =
      await this.notificacionRepository.findByUsuario(
        usuarioId,
        empresaId,
        query,
      );

    return NotificacionMapper.toPaginatedResponse(
      notificaciones,
      total,
      query,
    );
  }

  async marcarLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<NotificacionResponseDto> {
    const actualizada =
      await this.notificacionRepository.markAsLeida(
        id,
        usuarioId,
        empresaId,
      );

    if (!actualizada) {
      throw new NotFoundException(
        `Notificación ${id} no encontrada`,
      );
    }

    return NotificacionMapper.toResponse(actualizada);
  }

  /**
   * HU-26 criterio 4:
   * contador de notificaciones no leídas.
   */
  async contarNoLeidas(
    usuarioId: number,
    empresaId: number,
  ): Promise<{ total: number }> {
    const total =
      await this.notificacionRepository.countNoLeidas(
        usuarioId,
        empresaId,
      );

    return { total };
  }

  /**
   * HU-26 + HU-29:
   * Gestión de configuración nivel -> rol o nivel -> usuario.
   */
  async listarConfiguracion(
    empresaId: number,
  ): Promise<ConfiguracionNotificacionNivel[]> {
    return this.configuracionRepository.findByEmpresa(
      empresaId,
    );
  }

  async crearConfiguracion(
    empresaId: number,
    dto: CrearConfiguracionNotificacionDto,
  ): Promise<ConfiguracionNotificacionNivel> {
    const tieneRol = dto.rolId != null;
    const tieneUsuario = dto.usuarioId != null;

    /**
     * HU-29:
     * Debe existir exactamente una fuente de destinatario.
     *
     * Válidos:
     * - rolId solamente
     * - usuarioId solamente
     *
     * Inválidos:
     * - ninguno
     * - ambos
     */
    if (tieneRol === tieneUsuario) {
      throw new BadRequestException(
        'Debe indicar exactamente uno: rolId o usuarioId.',
      );
    }

    return this.configuracionRepository.create({
      empresaId,
      nivelAlerta: dto.nivelAlerta,
      rolId: dto.rolId ?? null,
      usuarioId: dto.usuarioId ?? null,
    });
  }

  /**
   * HU-29 criterio 4:
   * No permite dejar el nivel CRITICA sin destinatarios.
   */
  async eliminarConfiguracion(
    id: number,
    empresaId: number,
  ): Promise<void> {
    const config =
      await this.configuracionRepository.findById(
        id,
        empresaId,
      );

    if (!config) {
      throw new NotFoundException(
        `Configuración ${id} no encontrada`,
      );
    }

    if (config.nivelAlerta === NivelAlerta.CRITICA) {
      const totalCritica =
        await this.configuracionRepository.countByNivel(
          empresaId,
          NivelAlerta.CRITICA,
        );

      if (totalCritica <= 1) {
        throw new BadRequestException(
          'Debe quedar al menos un destinatario configurado para el nivel crítico.',
        );
      }
    }

    const eliminado =
      await this.configuracionRepository.delete(
        id,
        empresaId,
      );

    if (!eliminado) {
      throw new NotFoundException(
        `Configuración ${id} no encontrada`,
      );
    }
  }

  /**
   * HU-27:
   * Marca una alerta como resuelta con su acción correctiva.
   */
  async resolverAlerta(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: ResolverAlertaDto,
  ): Promise<NotificacionResponseDto> {
    const notificacion =
      await this.notificacionRepository.findById(
        id,
        empresaId,
      );

    if (!notificacion) {
      throw new NotFoundException(
        `Alerta ${id} no encontrada`,
      );
    }

    if (
      notificacion.tipo !==
      TipoNotificacion.ALERTA_UMBRAL
    ) {
      throw new BadRequestException(
        'Solo se pueden resolver notificaciones de tipo alerta',
      );
    }

    if (
      notificacion.estado ===
      EstadoAlerta.CERRADA
    ) {
      throw new BadRequestException(
        'La alerta ya se encuentra cerrada',
      );
    }

    const resuelta =
      await this.notificacionRepository.resolver(
        id,
        empresaId,
        dto.accionCorrectiva,
        usuarioId,
      );

    if (!resuelta) {
      throw new NotFoundException(
        `Alerta ${id} no encontrada`,
      );
    }

    return NotificacionMapper.toResponse(resuelta);
  }

  /**
   * HU-27 + HU-28:
   * Historial paginado.
   */
  async obtenerHistorial(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<NotificacionPaginadaResponseDto> {
    const [alertas, total] =
      await this.notificacionRepository.findHistorial(
        empresaId,
        query,
      );

    return NotificacionMapper.toPaginatedResponse(
      alertas,
      total,
      query,
    );
  }

  /**
   * HU-28:
   * Exportar historial a CSV.
   */
  async exportarHistorialCsv(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<Buffer> {
    const alertas =
      await this.notificacionRepository.findHistorialCompleto(
        empresaId,
        query,
      );

    const escaparCsv = (
      valor: unknown,
    ): string => {
      if (
        valor === null ||
        valor === undefined
      ) {
        return '';
      }

      const texto = String(valor);

      return `"${texto.replace(
        /"/g,
        '""',
      )}"`;
    };

    const filas: string[] = [];

    filas.push(
      [
        'Fecha',
        'Lote',
        'Parámetro',
        'Nivel',
        'Estado',
        'Acción correctiva',
      ]
        .map(escaparCsv)
        .join(';'),
    );

    for (const alerta of alertas) {
      const lote =
        alerta.lote?.codigo ??
        alerta.data?.loteCodigo ??
        alerta.loteId ??
        '';

      filas.push(
        [
          this.formatearFecha(
            alerta.createdAt,
          ),
          lote,
          alerta.parametro ?? '',
          alerta.nivelAlerta ?? '',
          alerta.estado ?? '',
          alerta.accionCorrectiva ?? '',
        ]
          .map(escaparCsv)
          .join(';'),
      );
    }

    const contenido =
      '\uFEFF' +
      filas.join('\r\n');

    return Buffer.from(
      contenido,
      'utf8',
    );
  }

  /**
   * HU-28:
   * Exportar historial a PDF.
   */
  async exportarHistorialPdf(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<Buffer> {
    const alertas =
      await this.notificacionRepository.findHistorialCompleto(
        empresaId,
        query,
      );

    return new Promise<Buffer>(
      (resolve, reject) => {
        const doc =
          new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 30,
          });

        const chunks: Buffer[] = [];

        doc.on(
          'data',
          (chunk: Buffer) => {
            chunks.push(chunk);
          },
        );

        doc.on(
          'end',
          () => {
            resolve(
              Buffer.concat(chunks),
            );
          },
        );

        doc.on(
          'error',
          reject,
        );

        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(
            'Historial de alertas',
            {
              align: 'center',
            },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            `Fecha de generación: ${new Date().toLocaleString(
              'es-AR',
            )}`,
            {
              align: 'right',
            },
          );

        doc.moveDown();

        const startX = 30;

        const columns = [
          {
            title: 'Fecha',
            x: startX,
            width: 95,
          },
          {
            title: 'Lote',
            x: startX + 95,
            width: 85,
          },
          {
            title: 'Parámetro',
            x: startX + 180,
            width: 95,
          },
          {
            title: 'Nivel',
            x: startX + 275,
            width: 75,
          },
          {
            title: 'Estado',
            x: startX + 350,
            width: 75,
          },
          {
            title: 'Acción correctiva',
            x: startX + 425,
            width: 360,
          },
        ];

        const drawHeader = () => {
          const y = doc.y;

          doc
            .fontSize(9)
            .font('Helvetica-Bold');

          for (const column of columns) {
            doc.text(
              column.title,
              column.x,
              y,
              {
                width: column.width,
                align: 'left',
              },
            );
          }

          doc.moveDown();

          doc
            .moveTo(
              startX,
              doc.y,
            )
            .lineTo(
              startX + 785,
              doc.y,
            )
            .stroke();

          doc.moveDown(0.5);
        };

        const drawRow = (
          fecha: string,
          lote: string,
          parametro: string,
          nivel: string,
          estado: string,
          accionCorrectiva: string,
        ) => {
          const y = doc.y;

          doc
            .fontSize(8)
            .font('Helvetica');

          const values = [
            fecha,
            lote,
            parametro,
            nivel,
            estado,
            accionCorrectiva,
          ];

          let maxHeight = 0;

          columns.forEach(
            (column, index) => {
              const height =
                doc.heightOfString(
                  values[index],
                  {
                    width:
                      column.width,
                  },
                );

              maxHeight =
                Math.max(
                  maxHeight,
                  height,
                );

              doc.text(
                values[index],
                column.x,
                y,
                {
                  width:
                    column.width,
                  align: 'left',
                },
              );
            },
          );

          doc.y =
            y +
            Math.max(
              maxHeight,
              12,
            ) +
            6;
        };

        drawHeader();

        for (const alerta of alertas) {
          if (doc.y > 520) {
            doc.addPage();
            drawHeader();
          }

          const lote =
            alerta.lote?.codigo ??
            alerta.data?.loteCodigo ??
            String(
              alerta.loteId ?? '',
            );

          drawRow(
            this.formatearFecha(
              alerta.createdAt,
            ),
            String(lote),
            String(
              alerta.parametro ?? '',
            ),
            String(
              alerta.nivelAlerta ?? '',
            ),
            String(
              alerta.estado ?? '',
            ),
            String(
              alerta.accionCorrectiva ??
                '',
            ),
          );
        }

        if (alertas.length === 0) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(
              'No se encontraron alertas para los filtros seleccionados.',
              {
                align: 'center',
              },
            );
        }

        doc.end();
      },
    );
  }

  private formatearFecha(
    fecha: Date,
  ): string {
    return new Intl.DateTimeFormat(
      'es-AR',
      {
        dateStyle: 'short',
        timeStyle: 'medium',
      },
    ).format(fecha);
  }

  /**
   * HU-31:
   * Genera una alerta crítica de sensor desconectado, una fila por
   * destinatario configurado para nivel CRITICA. No genera duplicados
   * mientras exista una alerta abierta para el mismo sensor.
   */
  async generarAlertaSensorDesconectado(params: {
    empresaId: number;
    sensorId: number;
    sensorNombre: string;
    ultimaLectura: Date | null;
    minutosSinDatos: number;
  }): Promise<NotificacionResponseDto[]> {
    const { empresaId, sensorId, sensorNombre, ultimaLectura, minutosSinDatos } =
      params;

    const alertaAbiertaExistente =
      await this.notificacionRepository.findAlertaAbiertaPorSensor(
        empresaId,
        sensorId,
        TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
      );

    if (alertaAbiertaExistente) {
      return [];
    }

    const responsables = await this.obtenerDestinatariosPorNivel(
      empresaId,
      NivelAlerta.CRITICA,
    );

    const mensaje =
      `Alerta crítica: el sensor "${sensorNombre}" no envía datos hace ` +
      `${minutosSinDatos} minutos. Última lectura: ` +
      `${ultimaLectura ? ultimaLectura.toISOString() : 'sin registro'}.`;

    const data: Record<string, unknown> = {
      sensorId,
      sensorNombre,
      ultimaLectura: ultimaLectura?.toISOString() ?? null,
      minutosSinDatos,
    };

    const notificaciones: NotificacionResponseDto[] = [];

      // 👇 Log para ver qué usuarios devuelve
    console.log('Responsables nivel crítica:', responsables.map(u => ({
      id: u.id,
      name: u.name,
      rolId: u.rolId,
      rolNombre: u.rol?.nombre,
    })));

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo: TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
        nivelAlerta: NivelAlerta.CRITICA,
        sensorId,
      });

      const creada = await this.notificacionRepository.create(entity);
      const response = NotificacionMapper.toResponse(creada);

      this.gateway.emitirNotificacion(response, empresaId, usuario.id);
      notificaciones.push(response);
    }

    return notificaciones;
  }

  async resolverAlertaSensorDesconectado(
    sensorId: number,
    empresaId: number,
  ): Promise<void> {
    await this.notificacionRepository.cerrarAlertasAbiertasPorSensor(
      empresaId,
      sensorId,
      TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
    );
  }
}