import { Inject, Injectable, Logger } from '@nestjs/common';

import { AuditLog } from './entity/audit-log.entity';
import type {
  CreateAuditLogData,
  IAuditLogRepository,
} from './repository/audit-log-interface.repository';
import { AUDIT_LOG_REPOSITORY } from './repository/audit-log-interface.repository';
import type { TenantContext } from '../../common/types/tenant-context.type';

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async record(data: CreateAuditLogData): Promise<void> {
    // La auditoría es "best effort": si falla, se loguea pero nunca debe
    // romper la operación de negocio que la disparó.
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
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<[AuditLog[], number]> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const skip = (safePage - 1) * safeLimit;

    return this.auditLogRepository.findAllScoped(tenant, skip, safeLimit);
  }
}