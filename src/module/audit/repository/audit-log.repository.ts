import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { AuditLog } from '../entity/audit-log.entity';
import type {
  AuditLogFilters,
  CreateAuditLogData,
  IAuditLogRepository,
} from './audit-log-interface.repository';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';

const EXPORT_MAX_ROWS = 10000;

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const entry = this.repo.create({
      ...data,
      userId: data.userId ?? undefined,
      empresaId: data.empresaId ?? undefined,
      entidadId: data.entidadId ?? undefined,
      detalle: data.detalle ?? undefined,
    });

    return this.repo.save(entry);
  }

  async findFiltered(
    tenant: TenantContext,
    filters: AuditLogFilters,
    skip: number,
    take: number,
  ): Promise<[AuditLog[], number]> {
    const qb = this.buildFilteredQuery(tenant, filters).orderBy(
      'log.createdAt',
      'DESC',
    );

    qb.skip(skip).take(take);

    return qb.getManyAndCount();
  }

  async findAllMatching(
    tenant: TenantContext,
    filters: AuditLogFilters,
  ): Promise<AuditLog[]> {
    const qb = this.buildFilteredQuery(tenant, filters)
      .orderBy('log.createdAt', 'DESC')
      .take(EXPORT_MAX_ROWS);

    return qb.getMany();
  }

  private buildFilteredQuery(
    tenant: TenantContext,
    filters: AuditLogFilters,
  ): SelectQueryBuilder<AuditLog> {
    const isGlobalAccess = tenant.rolNombre === ROLES.ADMINISTRADOR;
    const qb = this.repo.createQueryBuilder('log');

    if (!isGlobalAccess) {
      qb.andWhere('log.empresaId = :empresaId', {
        empresaId: tenant.empresaId ?? null,
      });
    }

    if (filters.userId !== undefined) {
      qb.andWhere('log.userId = :userId', { userId: filters.userId });
    }

    if (filters.tipo) {
      qb.andWhere('log.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters.accion) {
      if (filters.estado) {
        qb.andWhere('log.accion = :accionExacta', {
          accionExacta: `${filters.accion}_${filters.estado}`,
        });
      } else {
        qb.andWhere('log.accion LIKE :accionBase', {
          accionBase: `${filters.accion}%`,
        });
      }
    } else if (filters.estado) {
      qb.andWhere('log.accion LIKE :estadoSufijo', {
        estadoSufijo: `%_${filters.estado}`,
      });
    }

    if (filters.fechaDesde) {
      qb.andWhere('log.createdAt >= :fechaDesde', {
        fechaDesde: filters.fechaDesde,
      });
    }

    if (filters.fechaHasta) {
      qb.andWhere('log.createdAt <= :fechaHasta', {
        fechaHasta: filters.fechaHasta,
      });
    }

    return qb;
  }

  // HU-63
  async findPrimerosYUltimos(
    entidad: string,
    entidadIds: number[],
    empresaId: number | null,
  ): Promise<AuditLog[]> {
    if (entidadIds.length === 0) return [];

    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.entidad = :entidad', { entidad })
      .andWhere('log.entidadId IN (:...entidadIds)', { entidadIds })
      .andWhere("log.accion LIKE '%\\_SUCCESS' ESCAPE '\\'")
      .orderBy('log.entidadId', 'ASC')
      .addOrderBy('log.createdAt', 'ASC');

    if (empresaId !== null) {
      qb.andWhere('log.empresaId = :empresaId', { empresaId });
    }

    return qb.getMany();
  }
}