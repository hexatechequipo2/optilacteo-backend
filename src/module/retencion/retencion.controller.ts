import {
  Controller,
  Get,
  Patch,
  Body,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { PoliticaRetencionService } from './politica-retencion.service';
import { RetencionArchivadoService } from './retencion-archivado.service';
import { UpdatePoliticaRetencionDto } from './dto/update-politica-retencion.dto';

@ApiTags('retencion')
@ApiBearerAuth()
@Controller('retencion')
@UseGuards(RolesGuard, PermissionsGuard)
export class RetencionController {
  constructor(
    private readonly politicaRetencionService: PoliticaRetencionService,
    private readonly archivadoService: RetencionArchivadoService,
  ) {}

  @Get('politica')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.TRAZABILIDAD, 'canRead')
  getPolitica(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.politicaRetencionService.getConfig(tenant.empresaId);
  }

  // AC4: solo GERENTE puede tocar la política, y el service igual valida
  // el mínimo de 24 meses aunque quien llame tenga ese rol.
  @Patch('politica')
  @Roles(ROLES.GERENTE)
  @Permissions(ModuloSistema.TRAZABILIDAD, 'canWrite')
  @AuditLog(
    'RETENCION_POLITICA_ACTUALIZAR',
    'PoliticaRetencion',
    TipoAccion.CONFIGURACION,
  )
  updatePolitica(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: UpdatePoliticaRetencionDto,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.politicaRetencionService.update(tenant.empresaId, dto);
  }

  // AC3 (variante elegida en vez de push automático): consulta manual del
  // admin/gerente. Junta las 4 entidades en alcance.
  @Get('proximos-a-vencer')
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(ModuloSistema.TRAZABILIDAD, 'canRead')
  getProximosAVencer(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.archivadoService.findProximosAVencer(tenant.empresaId);
  }
}