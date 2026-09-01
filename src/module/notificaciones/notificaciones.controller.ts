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

// HU-31
import { ConfiguracionAlertaDesconexionService } from './configuracion-alerta-desconexion.service';
import { ActualizarConfiguracionAlertaDesconexionDto } from './dto/actualizar-configuracion-alerta-desconexion.dto';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(RolesGuard, PermissionsGuard)
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
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
  listarConfiguracion(@CurrentEmpresa() tenant: TenantContext) {
    return this.notificacionesService.listarConfiguracion(tenant.empresaId!);
  }

  @Post('configuracion')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canWrite')
  @AuditLog(
    'CONFIGURACION_NOTIFICACION_CREAR',
    'ConfiguracionNotificacionNivel',
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
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canWrite')
  @AuditLog(
    'CONFIGURACION_NOTIFICACION_ELIMINAR',
    'ConfiguracionNotificacionNivel',
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
   * HU-27 + HU-28
   * HISTORIAL DE ALERTAS
   * ============================================================
   */
  @Get('historial')
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.ADMINISTRADOR,
    ROLES.GERENTE,
  )
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
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
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.ADMINISTRADOR,
    ROLES.GERENTE,
  )
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
  @ApiProduces('text/csv')
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
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.ADMINISTRADOR,
    ROLES.GERENTE,
  )
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
  @ApiProduces('application/pdf')
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
      req.user.sub,
      dto,
    );
  }

  /**
   * ============================================================
   * HU-31
   * CONFIGURACIÓN DE ALERTA DE DESCONEXIÓN (por empresa)
   * ============================================================
   */
  @Get('configuracion-alerta-desconexion')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canRead')
  obtenerConfiguracionAlertaDesconexion(
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.configuracionAlertaDesconexionService.obtenerOCrear(
      tenant.empresaId!,
    );
  }

  @Patch('configuracion-alerta-desconexion')
  @Roles(ROLES.ADMINISTRADOR, ROLES.GERENTE)
  @Permissions(ModuloSistema.MONITOREO_ALERTAS, 'canWrite')
  @AuditLog(
    'CONFIGURACION_ALERTA_DESCONEXION_ACTUALIZAR',
    'ConfiguracionAlertaDesconexion',
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
