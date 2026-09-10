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
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { TenantContext } from '../../common/types/tenant-context.type';

import { ROLES } from '../rol/constants/roles.constants';
import { ModuloSistema } from '../empresa/enums/modulo-sistema.enum';

@ApiTags('destinos-productivos')
@ApiBearerAuth()
@Controller('destinos-productivos')
@UseGuards(RolesGuard, PermissionsGuard)
export class DestinoProductivoController {
  constructor(
    private readonly destinoProductivoService: DestinoProductivoService,
  ) {}

  // HU-49: catálogo de destinos productivos de la empresa del tenant.
  @Get()
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.DESTINO_PRODUCTIVO_IA], 'canRead')
  findActivos(@CurrentEmpresa() tenant: TenantContext) {
    return this.destinoProductivoService.findActivos(tenant);
  }

  // Crear un nuevo destino productivo para la empresa del tenant.
  @Post()
  @Roles(
    ROLES.RESPONSABLE_PRODUCCION,
    ROLES.RESPONSABLE_CALIDAD,
    ROLES.GERENTE,
    ROLES.ADMINISTRADOR,
  )
  @Permissions([ModuloSistema.DESTINO_PRODUCTIVO_IA], 'canWrite')
  create(
    @CurrentEmpresa() tenant: TenantContext,
    @Body() dto: CreateDestinoProductivoDto,
  ) {
    return this.destinoProductivoService.create(tenant, dto);
  }
}