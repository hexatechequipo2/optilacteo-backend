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

import { NotificacionMapper } from './mappers/notificacion.mapper';

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
import { ConfiguracionNotificacionResponseDto } from './dto/configuracion-notificacion-response.dto';
import { ConfiguracionNotificacionMapper } from './mappers/configuracion-notificacion.mapper';

import { HttpMlClient } from '../ml/infrastructure/http-ml-client';
import { TipoDesvioAnomalia } from './enums/tipo-desvio-anomalia.enum';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ConfiguracionSilencioAlerta } from './entities/configuracion-silencio-alerta.entity';
import { CrearConfiguracionSilencioDto } from './dto/crear-configuracion-silencio.dto';
import { ActualizarConfiguracionSilencioDto } from './dto/actualizar-configuracion-silencio.dto';
import { ConfiguracionSilencioResponseDto } from './dto/configuracion-silencio-response.dto';
import { ConfiguracionSilencioMapper } from './mappers/configuracion-silencio-alerta.mapper';
import type { IConfiguracionSilencioRepository } from './repository/configuracion-silencio-alerta.repository.interface';
import { CONFIGURACION_SILENCIO_REPOSITORY } from './repository/configuracion-silencio-alerta.repository.interface';

@Injectable()
export class NotificacionesService {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY)
    private readonly notificacionRepository: INotificacionRepository,

    @Inject(CONFIGURACION_NOTIFICACION_REPOSITORY)
    private readonly configuracionRepository: IConfiguracionNotificacionRepository,

    @Inject(CONFIGURACION_SILENCIO_REPOSITORY)
    private readonly configuracionSilencioRepository: IConfiguracionSilencioRepository,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly gateway: NotificacionesGateway,
    private readonly mlClient: HttpMlClient,
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

    const fechaAlerta = timestamp ?? new Date();

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
      timestamp: fechaAlerta.toISOString(),
    };

    const notificaciones: NotificacionResponseDto[] = [];

    /**
     * HU-30:
     * Se calcula una sola vez (mismo resultado para todos los
     * destinatarios). Solo aplica a nivel INFORMATIVA; ADVERTENCIA
     * y CRITICA nunca se silencian.
     */
    const silenciada = await this.debeSilenciarse(
      empresaId,
      nivelAlerta,
      fechaAlerta,
    );

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

      /**
       * HU-30 criterio 4:
       * La notificación siempre se persiste; el horario de silencio
       * solo bloquea el push, no el registro.
       */
      if (!silenciada) {
        this.gateway.emitirNotificacion(response, empresaId, usuario.id);
      }

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
      'DEBUG obtenerDestinatariosPorNivel -> empresaId:',
      empresaId,
      'nivelAlerta:',
      nivelAlerta,
      'rolIds:',
      rolIds,
      'usuarioIds:',
      usuarioIds,
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

      return ((umbralMin - valor) / Math.abs(umbralMin)) * 100;
    }

    if (valor > umbralMax) {
      if (umbralMax === 0) {
        return 100;
      }

      return ((valor - umbralMax) / Math.abs(umbralMax)) * 100;
    }

    return 0;
  }

  private determinarNivelAlerta(desvioPorcentaje: number): NivelAlerta {
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
    const { parametro, valor, umbralMin, umbralMax, loteCodigo, nivelAlerta } =
      params;

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

    return NotificacionMapper.toPaginatedResponse(notificaciones, total, query);
  }

  async marcarLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<NotificacionResponseDto> {
    const actualizada = await this.notificacionRepository.markAsLeida(
      id,
      usuarioId,
      empresaId,
    );

    if (!actualizada) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
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
    const total = await this.notificacionRepository.countNoLeidas(
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
  ): Promise<ConfiguracionNotificacionResponseDto[]> {
    const configs = await this.configuracionRepository.findByEmpresa(empresaId);
    return ConfiguracionNotificacionMapper.toResponseList(configs);
  }

  async crearConfiguracion(
    empresaId: number,
    dto: CrearConfiguracionNotificacionDto,
  ): Promise<ConfiguracionNotificacionNivel> {
    const tieneRol = dto.rolId != null;
    const tieneUsuario = dto.usuarioId != null;

    if (tieneRol === tieneUsuario) {
      throw new BadRequestException(
        'Debe indicar exactamente uno: rolId o usuarioId.',
      );
    }

    if (tieneUsuario) {
      const usuario = await this.userRepository.findOne({
        where: {
          id: dto.usuarioId,
          empresa: { id: empresaId },
          isActive: true,
        },
      });

      if (!usuario) {
        throw new BadRequestException(
          'El usuario indicado no existe o no pertenece a esta empresa.',
        );
      }
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
  async eliminarConfiguracion(id: number, empresaId: number): Promise<void> {
    const config = await this.configuracionRepository.findById(id, empresaId);

    if (!config) {
      throw new NotFoundException(`Configuración ${id} no encontrada`);
    }

    if (config.nivelAlerta === NivelAlerta.CRITICA) {
      const totalCritica = await this.configuracionRepository.countByNivel(
        empresaId,
        NivelAlerta.CRITICA,
      );

      if (totalCritica <= 1) {
        throw new BadRequestException(
          'Debe quedar al menos un destinatario configurado para el nivel crítico.',
        );
      }
    }

    const eliminado = await this.configuracionRepository.delete(id, empresaId);

    if (!eliminado) {
      throw new NotFoundException(`Configuración ${id} no encontrada`);
    }
  }

  /**
   * HU-50:
   * Genera una alerta de anomalía consultando al microservicio ML.
   * Evita duplicados y notifica a los responsables configurados.
   */
  async generarAlertaAnomalia(params: {
    empresaId: number;
    loteId: number;
    loteCodigo: string;
    parametro: Parametro;
    valor: number;
  }): Promise<NotificacionResponseDto[]> {
    const { empresaId, loteId, loteCodigo, parametro, valor } = params;

    // Llamada al microservicio ML
    const resultado = await this.mlClient.detectarAnomalia(
      empresaId,
      parametro,
      valor,
    );

    if (resultado.status !== 'ok' || !resultado.esAnomalia) {
      return [];
    }

    // Evitar duplicados
    const alertaAbiertaExistente =
      await this.notificacionRepository.findAlertaAbiertaAnomalia(
        empresaId,
        loteId,
        parametro,
        TipoDesvioAnomalia.TENDENCIA, // tipoDesvio si aplica
      );

    if (alertaAbiertaExistente) {
      return [];
    }

    const responsables = await this.obtenerDestinatariosPorNivel(
      empresaId,
      NivelAlerta.CRITICA,
    );

    const mensaje =
      `Alerta de anomalía: el parámetro ${parametro} ` +
      `del lote ${loteCodigo} registró un valor de ${valor}.`;

    const data: Record<string, unknown> = {
      loteId,
      loteCodigo,
      parametro,
      valor,
      confianza: resultado.confianza,
    };

    const notificaciones: NotificacionResponseDto[] = [];

    for (const usuario of responsables) {
      const entity = NotificacionMapper.toEntity({
        tipo: TipoNotificacion.ALERTA_ANOMALIA,
        mensaje,
        data,
        usuarioId: usuario.id,
        empresaId,
        nivelAlerta: NivelAlerta.CRITICA,
        loteId,
        parametro,
      });

      const creada = await this.notificacionRepository.create(entity);
      const response = NotificacionMapper.toResponse(creada);

      this.gateway.emitirNotificacion(response, empresaId, usuario.id);
      notificaciones.push(response);
    }

    return notificaciones;
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
    const notificacion = await this.notificacionRepository.findById(
      id,
      empresaId,
    );

    if (!notificacion) {
      throw new NotFoundException(`Alerta ${id} no encontrada`);
    }

    if (notificacion.tipo !== TipoNotificacion.ALERTA_UMBRAL) {
      throw new BadRequestException(
        'Solo se pueden resolver notificaciones de tipo alerta',
      );
    }

    if (notificacion.estado === EstadoAlerta.CERRADA) {
      throw new BadRequestException('La alerta ya se encuentra cerrada');
    }

    const resuelta = await this.notificacionRepository.resolver(
      id,
      empresaId,
      dto.accionCorrectiva,
      usuarioId,
    );

    if (!resuelta) {
      throw new NotFoundException(`Alerta ${id} no encontrada`);
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
    const [alertas, total] = await this.notificacionRepository.findHistorial(
      empresaId,
      query,
    );

    return NotificacionMapper.toPaginatedResponse(alertas, total, query);
  }

  /**
   * HU-28:
   * Exportar historial a CSV.
   */
  async exportarHistorialCsv(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<Buffer> {
    const alertas = await this.notificacionRepository.findHistorialCompleto(
      empresaId,
      query,
    );

    const escaparCsv = (valor: unknown): string => {
      if (valor === null || valor === undefined) {
        return '';
      }

      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const texto = String(valor);

      return `"${texto.replace(/"/g, '""')}"`;
    };

    const filas: string[] = [];

    filas.push(
      ['Fecha', 'Lote', 'Parámetro', 'Nivel', 'Estado', 'Acción correctiva']
        .map(escaparCsv)
        .join(';'),
    );

    for (const alerta of alertas) {
      const lote =
        alerta.lote?.codigo ?? alerta.data?.loteCodigo ?? alerta.loteId ?? '';

      filas.push(
        [
          this.formatearFecha(alerta.createdAt),
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

    const contenido = '\uFEFF' + filas.join('\r\n');

    return Buffer.from(contenido, 'utf8');
  }

  /**
   * HU-28:
   * Exportar historial a PDF.
   */
  async exportarHistorialPdf(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<Buffer> {
    const alertas = await this.notificacionRepository.findHistorialCompleto(
      empresaId,
      query,
    );

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('Historial de alertas', {
        align: 'center',
      });

      doc.moveDown();

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Fecha de generación: ${new Date().toLocaleString('es-AR')}`, {
          align: 'right',
        });

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

        doc.fontSize(9).font('Helvetica-Bold');

        for (const column of columns) {
          doc.text(column.title, column.x, y, {
            width: column.width,
            align: 'left',
          });
        }

        doc.moveDown();

        doc
          .moveTo(startX, doc.y)
          .lineTo(startX + 785, doc.y)
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

        doc.fontSize(8).font('Helvetica');

        const values = [
          fecha,
          lote,
          parametro,
          nivel,
          estado,
          accionCorrectiva,
        ];

        let maxHeight = 0;

        columns.forEach((column, index) => {
          const height = doc.heightOfString(values[index], {
            width: column.width,
          });

          maxHeight = Math.max(maxHeight, height);

          doc.text(values[index], column.x, y, {
            width: column.width,
            align: 'left',
          });
        });

        doc.y = y + Math.max(maxHeight, 12) + 6;
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
          String(alerta.loteId ?? '');

        drawRow(
          this.formatearFecha(alerta.createdAt),
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          String(lote),
          String(alerta.parametro ?? ''),
          String(alerta.nivelAlerta ?? ''),
          String(alerta.estado ?? ''),
          String(alerta.accionCorrectiva ?? ''),
        );
      }

      if (alertas.length === 0) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('No se encontraron alertas para los filtros seleccionados.', {
            align: 'center',
          });
      }

      doc.end();
    });
  }

  private formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(fecha);
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
    const {
      empresaId,
      sensorId,
      sensorNombre,
      ultimaLectura,
      minutosSinDatos,
    } = params;

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
    console.log(
      'Responsables nivel crítica:',
      responsables.map((u) => ({
        id: u.id,
        name: u.name,
        rolId: u.rolId,
        rolNombre: u.rol?.nombre,
      })),
    );

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

  /**
   * HU-50 criterio 4:
   * Marca una alerta de anomalía como falso positivo. A diferencia de
   * resolverAlerta (HU-27), no pide accionCorrectiva: el estado resultante
   * (FALSO_POSITIVO) es en sí mismo la señal que consume el microservicio
   * ML como feedback negativo en el próximo reentrenamiento.
   */
  async marcarFalsoPositivo(
    id: number,
    empresaId: number,
    marcadaPorId: number,
  ): Promise<NotificacionResponseDto> {
    const notificacion = await this.notificacionRepository.findById(
      id,
      empresaId,
    );

    if (!notificacion) {
      throw new NotFoundException(`Alerta ${id} no encontrada`);
    }

    if (notificacion.tipo !== TipoNotificacion.ALERTA_ANOMALIA) {
      throw new BadRequestException(
        'Solo se pueden marcar como falso positivo notificaciones de tipo alerta de anomalía',
      );
    }

    if (notificacion.estado !== EstadoAlerta.ABIERTA) {
      throw new BadRequestException(
        'Solo se puede marcar como falso positivo una alerta abierta',
      );
    }

    const marcada = await this.notificacionRepository.marcarFalsoPositivo(
      id,
      empresaId,
      marcadaPorId,
    );

    if (!marcada) {
      throw new NotFoundException(`Alerta ${id} no encontrada`);
    }

    return NotificacionMapper.toResponse(marcada);
  }

    /**
   * ============================================================
   * HU-30: HORARIOS DE SILENCIO DE ALERTAS INFORMATIVAS
   * ============================================================
   */

  private readonly ZONA_HORARIA_SILENCIO = 'America/Argentina/Buenos_Aires';

  /**
   * Solo las alertas INFORMATIVA pueden silenciarse (criterio 3:
   * ADVERTENCIA y CRITICA nunca se silencian).
   */
  private async debeSilenciarse(
    empresaId: number,
    nivelAlerta: NivelAlerta | null | undefined,
    fecha: Date,
  ): Promise<boolean> {
    if (nivelAlerta !== NivelAlerta.INFORMATIVA) {
      return false;
    }

    const horarios =
      await this.configuracionSilencioRepository.findByEmpresa(empresaId);

    if (horarios.length === 0) {
      return false;
    }

    const { hora, diaSemana } = this.obtenerHoraYDiaEnZona(fecha);

    return horarios.some(
      (horario) =>
        this.aplicaDia(horario.diasSemana, diaSemana) &&
        this.estaEnRangoHorario(
          this.normalizarHora(horario.horaInicio),
          this.normalizarHora(horario.horaFin),
          hora,
        ),
    );
  }

  private obtenerHoraYDiaEnZona(fecha: Date): {
    hora: string;
    diaSemana: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.ZONA_HORARIA_SILENCIO,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });

    const partes = formatter.formatToParts(fecha);
    const obtener = (tipo: string) =>
      partes.find((p) => p.type === tipo)?.value ?? '';

    let hora = obtener('hour');
    // Bug conocido de Intl con hour12:false: a veces devuelve '24' en vez de '00'.
    if (hora === '24') {
      hora = '00';
    }

    const diasMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const diaSemana = diasMap[obtener('weekday')] ?? fecha.getUTCDay();

    return { hora: `${hora}:${obtener('minute')}`, diaSemana };
  }

  private aplicaDia(
    diasSemana: number[] | null | undefined,
    diaSemana: number,
  ): boolean {
    if (!diasSemana || diasSemana.length === 0) {
      return true; // todos los días
    }
    return diasSemana.includes(diaSemana);
  }

  /**
   * Intervalo [horaInicio, horaFin). Soporta cruce de medianoche
   * (ej. 22:00 -> 06:00).
   */
  private estaEnRangoHorario(
    horaInicio: string,
    horaFin: string,
    horaActual: string,
  ): boolean {
    if (horaInicio === horaFin) {
      return false;
    }

    if (horaInicio < horaFin) {
      return horaActual >= horaInicio && horaActual < horaFin;
    }

    return horaActual >= horaInicio || horaActual < horaFin;
  }

  private normalizarHora(hora: string): string {
    // Postgres 'time' puede devolver 'HH:mm:ss'; normalizamos a 'HH:mm'.
    return hora.length > 5 ? hora.slice(0, 5) : hora;
  }

  async listarHorariosSilencio(
    empresaId: number,
  ): Promise<ConfiguracionSilencioResponseDto[]> {
    const horarios =
      await this.configuracionSilencioRepository.findByEmpresa(empresaId);
    return ConfiguracionSilencioMapper.toResponseList(horarios);
  }

  async crearHorarioSilencio(
    empresaId: number,
    dto: CrearConfiguracionSilencioDto,
  ): Promise<ConfiguracionSilencioResponseDto> {
    this.validarHorario(dto.horaInicio, dto.horaFin);

    const existentes =
      await this.configuracionSilencioRepository.findByEmpresa(empresaId);

    const diasSemana =
      dto.diasSemana && dto.diasSemana.length > 0 ? dto.diasSemana : null;

    this.validarSinSolapamiento(
      dto.horaInicio,
      dto.horaFin,
      diasSemana,
      existentes,
    );

    const creado = await this.configuracionSilencioRepository.create({
      empresaId,
      nombre: dto.nombre ?? null,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      diasSemana,
    });

    return ConfiguracionSilencioMapper.toResponse(creado);
  }

  async actualizarHorarioSilencio(
    id: number,
    empresaId: number,
    dto: ActualizarConfiguracionSilencioDto,
  ): Promise<ConfiguracionSilencioResponseDto> {
    const existente = await this.configuracionSilencioRepository.findById(
      id,
      empresaId,
    );

    if (!existente) {
      throw new NotFoundException(`Horario de silencio ${id} no encontrado`);
    }

    const horaInicio = dto.horaInicio ?? existente.horaInicio;
    const horaFin = dto.horaFin ?? existente.horaFin;
    const diasSemana =
      dto.diasSemana !== undefined
        ? dto.diasSemana.length > 0
          ? dto.diasSemana
          : null
        : (existente.diasSemana ?? null);

    this.validarHorario(horaInicio, horaFin);

    const otros = (
      await this.configuracionSilencioRepository.findByEmpresa(empresaId)
    ).filter((h) => h.id !== id);

    this.validarSinSolapamiento(horaInicio, horaFin, diasSemana, otros);

    const actualizado = await this.configuracionSilencioRepository.update(
      id,
      empresaId,
      {
        nombre: dto.nombre !== undefined ? dto.nombre : existente.nombre,
        horaInicio,
        horaFin,
        diasSemana,
      },
    );

    if (!actualizado) {
      throw new NotFoundException(`Horario de silencio ${id} no encontrado`);
    }

    return ConfiguracionSilencioMapper.toResponse(actualizado);
  }

  async eliminarHorarioSilencio(id: number, empresaId: number): Promise<void> {
    const eliminado = await this.configuracionSilencioRepository.delete(
      id,
      empresaId,
    );

    if (!eliminado) {
      throw new NotFoundException(`Horario de silencio ${id} no encontrado`);
    }
  }

  private validarHorario(horaInicio: string, horaFin: string): void {
    if (horaInicio === horaFin) {
      throw new BadRequestException(
        'horaInicio y horaFin no pueden ser iguales',
      );
    }
  }

  private diasSeSolapan(
    a: number[] | null | undefined,
    b: number[] | null | undefined,
  ): boolean {
    if (!a || a.length === 0 || !b || b.length === 0) {
      return true;
    }
    return a.some((dia) => b.includes(dia));
  }

  private aHorarioEnMinutos(hora: string): number {
    const [h, m] = this.normalizarHora(hora).split(':').map(Number);
    return h * 60 + m;
  }

  private aIntervalos(
    horaInicio: string,
    horaFin: string,
  ): Array<[number, number]> {
    const inicio = this.aHorarioEnMinutos(horaInicio);
    const fin = this.aHorarioEnMinutos(horaFin);

    if (inicio < fin) {
      return [[inicio, fin]];
    }

    return [
      [inicio, 24 * 60],
      [0, fin],
    ];
  }

  private horariosSeSolapan(
    horaInicioA: string,
    horaFinA: string,
    horaInicioB: string,
    horaFinB: string,
  ): boolean {
    const intervalosA = this.aIntervalos(horaInicioA, horaFinA);
    const intervalosB = this.aIntervalos(horaInicioB, horaFinB);

    return intervalosA.some(([inicioA, finA]) =>
      intervalosB.some(([inicioB, finB]) => inicioA < finB && inicioB < finA),
    );
  }

  private validarSinSolapamiento(
    horaInicio: string,
    horaFin: string,
    diasSemana: number[] | null,
    existentes: ConfiguracionSilencioAlerta[],
  ): void {
    for (const existente of existentes) {
      if (!this.diasSeSolapan(diasSemana, existente.diasSemana)) {
        continue;
      }

      if (
        this.horariosSeSolapan(
          horaInicio,
          horaFin,
          existente.horaInicio,
          existente.horaFin,
        )
      ) {
        const etiqueta = existente.nombre ?? `#${existente.id}`;
        throw new BadRequestException(
          `El horario se superpone con la configuración existente "${etiqueta}".`,
        );
      }
    }
  }
}