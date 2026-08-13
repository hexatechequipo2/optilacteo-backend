import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  Post,
  Body,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionFilterQueryDto } from './dto/notificacion-filter-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { CrearConfiguracionNotificacionDto } from './dto/crear-configuracion-notificacion.dto';
import { HistorialAlertasQueryDto } from './dto/historial-alertas-query.dto';
import { ResolverAlertaDto } from './dto/resolver-alerta.dto';

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(RolesGuard, PermissionsGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  // Sin @Roles(): cada usuario ve solo SUS notificaciones (filtradas por
  // usuarioId), no hace falta restringir por rol acá.
  @Get()
  findMine(
    @Query() query: NotificacionFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    return this.notificacionesService.listarPorUsuario(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.user.sub,
      tenant.empresaId!,
      query,
    );
  }

  @Patch(':id/leida')
  marcarLeida(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    return this.notificacionesService.marcarLeida(
      +id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.user.sub,
      tenant.empresaId!,
    );
  }


  @Get('no-leidas/count')
  contarNoLeidas(@CurrentEmpresa() tenant: TenantContext, @Req() req: any) {
    return this.notificacionesService.contarNoLeidas(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.user.sub,
      tenant.empresaId!,
    );
  }

  @Get('configuracion')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
  listarConfiguracion(@CurrentEmpresa() tenant: TenantContext) {
    return this.notificacionesService.listarConfiguracion(tenant.empresaId!);
  }

  @Post('configuracion')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canWrite')
  @AuditLog('CONFIGURACION_NOTIFICACION_CREAR', 'ConfiguracionNotificacionNivel')
  crearConfiguracion(
    @Body() dto: CrearConfiguracionNotificacionDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.crearConfiguracion(tenant.empresaId!, dto);
  }

  @Delete('configuracion/:id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canWrite')
  @AuditLog('CONFIGURACION_NOTIFICACION_ELIMINAR', 'ConfiguracionNotificacionNivel')
  eliminarConfiguracion(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.eliminarConfiguracion(+id, tenant.empresaId!);
  }

  @Get('historial')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
  obtenerHistorial(
    @Query() query: HistorialAlertasQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.obtenerHistorial(tenant.empresaId!, query);
  }

  @Patch(':id/resolver')
  @Roles(ROLES.RESPONSABLE_PRODUCCION)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canWrite')
  @AuditLog('ALERTA_RESOLVER', 'Notificacion')
  resolverAlerta(
    @Param('id') id: string,
    @Body() dto: ResolverAlertaDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    return this.notificacionesService.resolverAlerta(
      +id,
      tenant.empresaId!,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.user.sub,
      dto,
    );
  }
}
