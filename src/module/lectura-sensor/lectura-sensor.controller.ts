import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { ROLES } from '../rol/constants/roles.constants';
import { LecturaSensorService } from './lectura-sensor.service';
import { IngresarLecturaDto } from './dto/ingresar-lectura.dto';
import { IngresarLecturaManualDto } from './dto/ingresar-lectura-manual.dto';
import { HistorialLecturaFilterQueryDto } from './dto/historial-lectura-filter-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Response } from 'express';

@ApiTags('lectura-sensor')
@ApiBearerAuth()
@Controller('sensores')
@UseGuards(RolesGuard, PermissionsGuard)
export class LecturaSensorController {
  constructor(private readonly lecturaSensorService: LecturaSensorService) {}

  // HU-13: ingesta de lecturas IoT vía API de PLC. Sin @Roles()/@Permissions():
  // lo llama una cuenta de servicio autenticada (simulador/PLC), no un usuario
  // con un rol de negocio específico. Los guards de clase no bloquean acá
  // porque ambos son no-op sin metadata (ver RolesGuard/PermissionsGuard).
  @Post('lecturas')
  ingresar(
    @Body() dto: IngresarLecturaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.lecturaSensorService.ingresar(dto, tenant);
  }

  // HU-15: fallback manual cuando el sensor no está ACTIVO. A diferencia del
  // endpoint de arriba, acá sí hay un usuario humano de la empresa detrás,
  // por eso exige permiso explícito de escritura.
  @Post('lecturas/manual')
  @Roles(ROLES.OPERARIO_LINEA)
  @Permissions(
    [ModuloSistema.RECEPCION, ModuloSistema.MONITOREO_ALERTAS],
    'canWrite',
  )
  @AuditLog('LECTURA_MANUAL_INGRESAR', 'SensorLectura')
  ingresarManual(
    @Body() dto: IngresarLecturaManualDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Req() req: any, // TODO: reemplazar por tu @CurrentUser() real
  ) {
    const usuarioId = req.user.sub;
    return this.lecturaSensorService.ingresarManual(dto, usuarioId, tenant);
  }

  // HU-19: consulta paginada del historial.
  // TODO: no existe rol "Jefe de producción" en roles.constants.ts. Se usa
  // RESPONSABLE_PRODUCCION como el más cercano — ajustar si se crea el rol
  // específico o si el nombre correcto ya existe con otra key.
  @Get('lecturas/historial-mediciones')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(
    [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
    'canRead',
  )
  consultarHistorial(
    @Query() query: HistorialLecturaFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.lecturaSensorService.consultarHistorial(query, tenant);
  }

  // HU-19 (criterio 3): exportación del historial filtrado, mismos filtros
  // que la consulta paginada.
  @Get('lecturas/historial-mediciones/export')
  @Roles(ROLES.RESPONSABLE_PRODUCCION, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Permissions(
    [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
    'canRead',
  )
  @AuditLog('HISTORIAL_LECTURAS_EXPORTAR', 'SensorLectura')
  async exportarHistorial(
    @Query() query: HistorialLecturaFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
    @Res() res: Response,
  ) {
    const csv = await this.lecturaSensorService.exportarHistorial(
      query,
      tenant,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="historial-mediciones-${Date.now()}.csv"`,
    );
    res.send(csv);
  }
}
