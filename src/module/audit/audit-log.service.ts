import { Inject, Injectable, Logger } from '@nestjs/common';

import { AuditLog } from './entity/audit-log.entity';
import type {
  AuditLogFilters,
  CreateAuditLogData,
  IAuditLogRepository,
} from './repository/audit-log-interface.repository';
import { AUDIT_LOG_REPOSITORY } from './repository/audit-log-interface.repository';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { TrazabilidadEntidadDto } from './dto/trazabilidad.dto';
import type { QueryAuditLogDto } from './dto/query-audit-log.dto';

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async record(data: CreateAuditLogData): Promise<void> {
    try {
      await this.auditLogRepository.create(data);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría [${data.accion} ${data.entidad}]: ${
          (error as Error).message
        }`,
      );
    }
  }

  findAll(
    tenant: TenantContext,
    query: QueryAuditLogDto,
  ): Promise<[AuditLog[], number]> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE), 200);
    const skip = (page - 1) * limit;

    return this.auditLogRepository.findFiltered(
      tenant,
      this.buildFilters(query),
      skip,
      limit,
    );
  }

  async exportarCsv(
    tenant: TenantContext,
    query: QueryAuditLogDto,
  ): Promise<string> {
    const registros = await this.auditLogRepository.findAllMatching(
      tenant,
      this.buildFilters(query),
    );

    return this.toCsv(registros);
  }

  private buildFilters(query: QueryAuditLogDto): AuditLogFilters {
    return {
      userId: query.userId,
      accion: query.accion,
      estado: query.estado,
      tipo: query.tipo,
      fechaDesde: query.fechaDesde ? new Date(query.fechaDesde) : undefined,
      fechaHasta: query.fechaHasta ? new Date(query.fechaHasta) : undefined,
    };
  }

  private toCsv(registros: AuditLog[]): string {
    const headers = [
      'id',
      'userId',
      'userEmail',
      'userNombre',
      'userRol',
      'empresaId',
      'accion',
      'entidad',
      'entidadId',
      'tipo',
      'descripcion',
      'createdAt',
    ];

    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      const escaped = str.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    };

    const rows = registros.map((r) =>
      [
        r.id,
        r.userId,
        r.userEmail,
        r.userNombre,
        r.userRol,
        r.empresaId,
        r.accion,
        r.entidad,
        r.entidadId,
        r.tipo,
        r.descripcion,
        r.createdAt.toISOString(),
      ]
        .map(escape)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // HU-63: trazabilidad de una sola entidad (vistas de detalle).
  async getTrazabilidad(
    entidad: string,
    entidadId: number,
    empresaId: number | null,
  ): Promise<TrazabilidadEntidadDto> {
    const mapa = await this.getTrazabilidadBatch(
      entidad,
      [entidadId],
      empresaId,
    );
    return mapa.get(entidadId) ?? {};
  }

  // HU-63: trazabilidad de N entidades en una sola consulta (listados).
  async getTrazabilidadBatch(
    entidad: string,
    entidadIds: number[],
    empresaId: number | null,
  ): Promise<Map<number, TrazabilidadEntidadDto>> {
    const resultado = new Map<number, TrazabilidadEntidadDto>();
    if (entidadIds.length === 0) return resultado;

    const registros = await this.auditLogRepository.findPrimerosYUltimos(
      entidad,
      entidadIds,
      empresaId,
    );

    const porEntidad = new Map<number, AuditLog[]>();
    for (const log of registros) {
      if (log.entidadId == null) continue;
      const lista = porEntidad.get(log.entidadId) ?? [];
      lista.push(log);
      porEntidad.set(log.entidadId, lista);
    }

    for (const [entidadId, logs] of porEntidad) {
      const primero = logs[0];
      const ultimo = logs[logs.length - 1];

      resultado.set(entidadId, {
        creadoPor: {
          userId: primero.userId,
          userEmail: primero.userEmail,
          fecha: primero.createdAt,
        },
        ultimaModificacion:
          ultimo.id !== primero.id
            ? {
                userId: ultimo.userId,
                userEmail: ultimo.userEmail,
                fecha: ultimo.createdAt,
              }
            : undefined,
      });
    }

    return resultado;
  }
}