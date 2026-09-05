import { Notificacion } from '../entities/notificacion.entity';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { HistorialAlertasQueryDto } from '../dto/historial-alertas-query.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { TipoDesvioAnomalia } from '../enums/tipo-desvio-anomalia.enum';

export const NOTIFICACION_REPOSITORY = 'NOTIFICACION_REPOSITORY';

export interface INotificacionRepository {
  create(notificacion: Partial<Notificacion>): Promise<Notificacion>;

  findByUsuario(
    usuarioId: number,
    empresaId: number,
    query: NotificacionFilterQueryDto,
  ): Promise<[Notificacion[], number]>;

  findById(id: number, empresaId: number): Promise<Notificacion | null>;

  markAsLeida(
    id: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<Notificacion | null>;

  countNoLeidas(usuarioId: number, empresaId: number): Promise<number>;

  // HU-27
  findAlertaAbiertaPorLoteYParametro(
    empresaId: number,
    loteId: number,
    parametro: Parametro,
  ): Promise<Notificacion | null>;

  resolver(
    id: number,
    empresaId: number,
    accionCorrectiva: string,
    resueltaPorId: number,
  ): Promise<Notificacion | null>;

  // HU-27 + HU-28
  findHistorial(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<[Notificacion[], number]>;

  // HU-28
  findHistorialCompleto(
    empresaId: number,
    query: HistorialAlertasQueryDto,
  ): Promise<Notificacion[]>;

  // HU-31
  findAlertaAbiertaPorSensor(
    empresaId: number,
    sensorId: number,
    tipo: TipoNotificacion,
  ): Promise<Notificacion | null>;

  cerrarAlertasAbiertasPorSensor(
    empresaId: number,
    sensorId: number,
    tipo: TipoNotificacion,
  ): Promise<void>;

  // HU-50
  findAlertaAbiertaAnomalia(
    empresaId: number,
    loteId: number,
    parametro: Parametro,
    tipoDesvio: TipoDesvioAnomalia,
  ): Promise<Notificacion | null>;

  marcarFalsoPositivo(
    id: number,
    empresaId: number,
    marcadaPorId: number,
  ): Promise<Notificacion | null>;
}