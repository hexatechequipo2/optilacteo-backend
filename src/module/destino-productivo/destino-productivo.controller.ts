import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { DestinoProductivoService } from './destino-productivo.service';
import { CreateDestinoProductivoDto } from './dto/create-destino-productivo.dto';

import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

import type { TenantContext } from '../../common/types/tenant-context.type';

import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';
import { PermissionAction } from '../../common/enums/permission-action.enum';

@ApiTags('destinos-productivos')
@ApiBearerAuth()
@Controller('destinos-productivos')
export class DestinoProductivoController {
  constructor(
    private readonly destinoProductivoService: DestinoProductivoService,
  ) {}

  // HU-49: catálogo de destinos productivos de la empresa del tenant.
  @Get()
  @Permissions([ModuloSistema.DESTINO_PRODUCTIVO_IA], PermissionAction.READ)
  findActivos(@CurrentEmpresa() tenant: TenantContext) {
    return this.destinoProductivoService.findActivos(tenant);
  }

  // Crear un nuevo destino productivo para la empresa del tenant.
  @Post()
  @Permissions([ModuloSistema.DESTINO_PRODUCTIVO_IA], PermissionAction.CREATE)
  create(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: CreateDestinoProductivoDto,
  ) {
    return this.destinoProductivoService.create(tenant, dto);
  }
}