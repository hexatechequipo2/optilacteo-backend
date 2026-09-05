import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { ROLES } from '../rol/constants/roles.constants';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AsistenteVozService } from './asistente-voz.service';
import { ParsearDictadoDto } from './dto/parsear-dictado.dto';

@ApiTags('asistente-voz')
@ApiBearerAuth()
@Controller('lotes/:id/dictado')
@UseGuards(RolesGuard, PermissionsGuard)
export class AsistenteVozController {
  constructor(private readonly asistenteVozService: AsistenteVozService) {}

  // Previsualización, no registro: por eso mismos guards/rol/permiso que
  // MedicionManualController.registrar, pero SIN @AuditLog — acá no se
  // persiste nada que auditar. El alta real sigue siendo
  // POST /lotes/:id/mediciones-manuales con el DTO ya existente.
  @Post('parsear')
  @Roles(ROLES.OPERARIO_LINEA)
  @Permissions([ModuloSistema.RECEPCION], 'canWrite')
  parsear(
    @Param('id') id: string,
    @Body() dto: ParsearDictadoDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.asistenteVozService.parsearDictado(+id, dto, tenant);
  }
}
