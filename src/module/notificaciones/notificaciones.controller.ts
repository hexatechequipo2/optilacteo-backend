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
  StreamableFile,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';

import { ApiBearerAuth, ApiTags, ApiProduces } from '@nestjs/swagger';

import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';

import type { TenantContext } from '../../common/types/tenant-context.type';

import { NotificacionesService } from './notificaciones.service';

import { NotificacionFilterQueryDto } from './dto/notificacion-filter-query.dto';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';

import { CrearConfiguracionNotificacionDto } from './dto/crear-configuracion-notificacion.dto';
import { HistorialAlertasQueryDto } from './dto/historial-alertas-query.dto';
import { ResolverAlertaDto } from './dto/resolver-alerta.dto';

// HU-31
import { ConfiguracionAlertaDesconexionService } from './configuracion-alerta-desconexion.service';
import { ActualizarConfiguracionAlertaDesconexionDto } from './dto/actualizar-configuracion-alerta-desconexion.dto';

import { CrearConfiguracionSilencioDto } from './dto/crear-configuracion-silencio.dto';
import { ActualizarConfiguracionSilencioDto } from './dto/actualizar-configuracion-silencio.dto';
import { PermissionAction } from '../../common/enums/permission-action.enum';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly configuracionAlertaDesconexionService: ConfiguracionAlertaDesconexionService,
  ) {}

  @Get()
  findMine(
    @Query() query: NotificacionFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    return this.notificacionesService.listarPorUsuario(
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
      req.user.sub,
      tenant.empresaId!,
    );
  }

  @Get('no-leidas/count')
  contarNoLeidas(@CurrentEmpresa() tenant: TenantContext, @Req() req: any) {
    return this.notificacionesService.contarNoLeidas(
      req.user.sub,
      tenant.empresaId!,
    );
  }

  @Get('configuracion')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.READ)
  listarConfiguracion(@CurrentEmpresa() tenant: TenantContext) {
    return this.notificacionesService.listarConfiguracion(tenant.empresaId!);
  }

  @Post('configuracion')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.CREATE)
  @AuditLog(
    'CONFIGURACION_NOTIFICACION_CREAR',
    'ConfiguracionNotificacionNivel',
    TipoAccion.CONFIGURACION,
  )
  crearConfiguracion(
    @Body() dto: CrearConfiguracionNotificacionDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.crearConfiguracion(
      tenant.empresaId!,
      dto,
    );
  }

  @Delete('configuracion/:id')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.CREATE)
  @AuditLog(
    'CONFIGURACION_NOTIFICACION_ELIMINAR',
    'ConfiguracionNotificacionNivel',
    TipoAccion.CONFIGURACION,
  )
  eliminarConfiguracion(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.eliminarConfiguracion(
      +id,
      tenant.empresaId!,
    );
  }

  /**
   * ============================================================
   * HU-27 + HU-28 + HU-50
   * HISTORIAL DE ALERTAS (umbral, sensor desconectado y anomalías)
   * ============================================================
   */
  @Get('historial')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.READ)
  obtenerHistorial(
    @Query() query: HistorialAlertasQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.obtenerHistorial(
      tenant.empresaId!,
      query,
    );
  }

  /**
   * ============================================================
   * HU-28
   * EXPORTAR HISTORIAL A CSV
   * ============================================================
   */
  @Get('historial/exportar/csv')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.READ)
  @ApiProduces('text/csv')
  @AuditLog('HISTORIAL_ALERTAS_EXPORTAR_CSV', 'HistorialAlertas', TipoAccion.EXPORTACION)
  async exportarHistorialCsv(
    @Query() query: HistorialAlertasQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.notificacionesService.exportarHistorialCsv(
      tenant.empresaId!,
      query,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="historial-alertas.csv"',
    );
    res.setHeader('Content-Length', buffer.length);

    res.end(buffer);
  }

  /**
   * ============================================================
   * HU-28
   * EXPORTAR HISTORIAL A PDF
   * ============================================================
   */
  @Get('historial/exportar/pdf')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.READ)
  @ApiProduces('application/pdf')
  @AuditLog('HISTORIAL_ALERTAS_EXPORTAR_PDF', 'HistorialAlertas', TipoAccion.EXPORTACION)
  async exportarHistorialPdf(
    @Query() query: HistorialAlertasQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.notificacionesService.exportarHistorialPdf(
      tenant.empresaId!,
      query,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="historial-alertas.pdf"',
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * ============================================================
   * HU-27
   * RESOLVER ALERTA
   * ============================================================
   */
  @Patch(':id/resolver')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.UPDATE)
  @AuditLog('ALERTA_RESOLVER', 'Notificacion', TipoAccion.EDICION)
  resolverAlerta(
    @Param('id') id: string,
    @Body() dto: ResolverAlertaDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    return this.notificacionesService.resolverAlerta(
      +id,
      tenant.empresaId!,
      req.user.sub,
      dto,
    );
  }

  /**
   * ============================================================
   * HU-50 criterio 4
   * MARCAR ANOMALÍA COMO FALSO POSITIVO
   * ============================================================
   */
  @Patch(':id/falso-positivo')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.UPDATE)
  @AuditLog('ANOMALIA_MARCAR_FALSO_POSITIVO', 'Notificacion', TipoAccion.EDICION)
  marcarFalsoPositivo(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any,
  ) {
    return this.notificacionesService.marcarFalsoPositivo(
      +id,
      tenant.empresaId!,
      req.user.sub,
    );
  }

  /**
   * ============================================================
   * HU-31
   * CONFIGURACIÓN DE ALERTA DE DESCONEXIÓN (por empresa)
   * ============================================================
   */
  @Get('configuracion-alerta-desconexion')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.READ)
  obtenerConfiguracionAlertaDesconexion(
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.configuracionAlertaDesconexionService.obtenerOCrear(
      tenant.empresaId!,
    );
  }

  /**
 * ============================================================
 * HU-30
 * HORARIOS DE SILENCIO DE ALERTAS INFORMATIVAS
 * ============================================================
 */
  @Get('horarios-silencio')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.READ)
  listarHorariosSilencio(@CurrentEmpresa() tenant: TenantContext) {
    return this.notificacionesService.listarHorariosSilencio(
      tenant.empresaId!,
    );
  }

  @Post('horarios-silencio')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.CREATE)
  @AuditLog('HORARIO_SILENCIO_CREAR', 'ConfiguracionSilencioAlerta', TipoAccion.CONFIGURACION)
  crearHorarioSilencio(
    @Body() dto: CrearConfiguracionSilencioDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.crearHorarioSilencio(
      tenant.empresaId!,
      dto,
    );
  }

  @Patch('horarios-silencio/:id')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.UPDATE)
  @AuditLog('HORARIO_SILENCIO_ACTUALIZAR', 'ConfiguracionSilencioAlerta', TipoAccion.CONFIGURACION)
  actualizarHorarioSilencio(
    @Param('id') id: string,
    @Body() dto: ActualizarConfiguracionSilencioDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.actualizarHorarioSilencio(
      +id,
      tenant.empresaId!,
      dto,
    );
  }

  @Delete('horarios-silencio/:id')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.DELETE)
  @AuditLog('HORARIO_SILENCIO_ELIMINAR', 'ConfiguracionSilencioAlerta', TipoAccion.CONFIGURACION)
  eliminarHorarioSilencio(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.notificacionesService.eliminarHorarioSilencio(
      +id,
      tenant.empresaId!,
    );
  }

  @Patch('configuracion-alerta-desconexion')
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, PermissionAction.UPDATE)
  @AuditLog(
    'CONFIGURACION_ALERTA_DESCONEXION_ACTUALIZAR',
    'ConfiguracionAlertaDesconexion',
    TipoAccion.CONFIGURACION,
  )
  actualizarConfiguracionAlertaDesconexion(
    @Body() dto: ActualizarConfiguracionAlertaDesconexionDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.configuracionAlertaDesconexionService.actualizar(
      tenant.empresaId!,
      dto.umbralMinutos,
    );
  }
}