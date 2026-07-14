import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLog } from './entity/audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditInterceptor } from './interceptor/audit-log.interceptor';
import {
  AUDIT_LOG_REPOSITORY,
} from './repository/audit-log-interface.repository';
import { AuditLogRepository } from './repository/audit-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepository,
    },
    // Global igual que hacen con JwtAuthGuard/RolesGuard en AuthModule:
    // el interceptor no hace nada salvo que el handler tenga @Audit().
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}