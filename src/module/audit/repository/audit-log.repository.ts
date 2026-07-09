import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from '../entity/audit-log.entity';
import type {
  CreateAuditLogData,
  IAuditLogRepository,
} from './audit-log-interface.repository';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    // Transformamos los valores nulos a undefined para cumplir con el contrato de DeepPartial
    const entry = this.repo.create({
      ...data,
      userId: data.userId ?? undefined,
      empresaId: data.empresaId ?? undefined,
      entidadId: data.entidadId ?? undefined,
      detalle: data.detalle ?? undefined,
    });
    
    return this.repo.save(entry);
  }

  async findAllScoped(
    tenant: TenantContext,
    skip: number,
    take: number,
  ): Promise<[AuditLog[], number]> {
    const isGlobalAccess = tenant.rolNombre === ROLES.ADMINISTRADOR;

    return this.repo.findAndCount({
      where: isGlobalAccess ? {} : { empresaId: tenant.empresaId ?? undefined },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}