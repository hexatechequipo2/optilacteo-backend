import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionFilterQueryDto } from './dto/notificacion-filter-query.dto';

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
}
