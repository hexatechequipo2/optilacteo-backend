import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AsistenteVozService } from './asistente-voz.service';
import { ParsearDictadoDto } from './dto/parsear-dictado.dto';

@ApiTags('asistente-voz')
@ApiBearerAuth()
@Controller('lotes/:id/dictado')
export class AsistenteVozController {
  constructor(private readonly asistenteVozService: AsistenteVozService) {}

  // Previsualización, no registro: no persiste nada, por eso no lleva @AuditLog.
  // El alta real sigue siendo POST /lotes/:id/mediciones-manuales.
  //
  // Es un POST que NO crea nada, así que no corresponde CREATE.
  // Se protege con el permiso que habilita el flujo del que forma parte.
  @Post('parsear')
  @Permissions(ModuloSistema.ASISTENTE_VOZ, PermissionAction.READ)
  parsear(
    @Param('id') id: string,
    @Body() dto: ParsearDictadoDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.asistenteVozService.parsearDictado(+id, dto, tenant);
  }
}