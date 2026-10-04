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
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { PoliticaRetencionService } from './politica-retencion.service';
import { RetencionArchivadoService } from './retencion-archivado.service';
import { UpdatePoliticaRetencionDto } from './dto/update-politica-retencion.dto';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('retencion')
@ApiBearerAuth()
@Controller('retencion')
export class RetencionController {
  constructor(
    private readonly politicaRetencionService: PoliticaRetencionService,
    private readonly archivadoService: RetencionArchivadoService,
  ) {}

  @Get('politica')
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.READ,
  )
  getPolitica(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.politicaRetencionService.getConfig(tenant.empresaId);
  }

  // AC4: solo GERENTE puede tocar la política, y el service igual valida
  // el mínimo de 24 meses aunque quien llame tenga ese rol.
  @Patch('politica')
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.UPDATE,
  )
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
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.READ,
  )
  getProximosAVencer(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.archivadoService.findProximosAVencer(tenant.empresaId);
  }
}