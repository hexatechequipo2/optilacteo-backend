import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { ConfigParametroService } from './config-parametro.service';
import { CreateConfigParametroDto } from './dto/create-config-parametro.dto';
import { UpdateConfigParametroDto } from './dto/update-config-parametro.dto';
import type { ConfigParametroResponseDto } from './dto/config-parametro-response.dto';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('config-parametros')
@ApiBearerAuth()
@Controller('config-parametros')
export class ConfigParametroController {
  constructor(
    private readonly configParametroService: ConfigParametroService,
  ) {}

  @Post()
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.CREATE)
  @AuditLog('CONFIG_PARAMETRO_CREAR', 'ConfiguracionParametro', TipoAccion.CONFIGURACION, (ctx) => {
    const body = ctx.responseBody as Partial<ConfigParametroResponseDto> | undefined;
    return `Umbral de ${body?.parametro ?? '?'} creado para ${body?.tipoMateriaPrima ?? '?'}: ${body?.umbralMin ?? '?'} - ${body?.umbralMax ?? '?'}`;
  })
  crear(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: CreateConfigParametroDto,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.crear(tenant.empresaId, dto);
  }

  @Put(':id')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.UPDATE)
  @AuditLog('CONFIG_PARAMETRO_ACTUALIZAR', 'ConfiguracionParametro', TipoAccion.CONFIGURACION, (ctx) => {
    const body = ctx.responseBody as Partial<ConfigParametroResponseDto> | undefined;
    return `Umbral de ${body?.parametro ?? '?'} modificado para ${body?.tipoMateriaPrima ?? '?'}: ${body?.umbralMin ?? '?'} - ${body?.umbralMax ?? '?'}`;
  })
  editar(
    @CurrentEmpresa() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigParametroDto,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.editar(tenant.empresaId, id, dto);
  }

  @Get()
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.READ)
  listar(@CurrentEmpresa() tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.listarPorEmpresa(
      tenant.empresaId,
      tenant,
    );
  }

  @Delete(':id')
  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.DELETE)
  @AuditLog('CONFIG_PARAMETRO_ELIMINAR', 'ConfiguracionParametro', TipoAccion.CONFIGURACION)
  eliminar(
    @CurrentEmpresa() tenant: TenantContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada.');
    }
    return this.configParametroService.eliminar(tenant.empresaId, id);
  }
}