import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { LoteService } from './lote.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { LoteFilterQueryDto } from './dto/lote-filter-query.dto';

@ApiTags('lote')
@ApiBearerAuth()
@Controller('lotes')    
export class LoteController {
  constructor(private readonly loteService: LoteService) {}

  // HU-60: registro de lotes — solo Responsable de calidad.
  @Post()
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('LOTE_REGISTRAR', 'Lote')
  create(
    @Body() createLoteDto: CreateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.create(createLoteDto, tenant);
  }

  @Get()
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  findAll(
    @Query() query: LoteFilterQueryDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.findAll(query, tenant);
  }

  @Get(':id')
  @Roles(ROLES.RESPONSABLE_CALIDAD, ROLES.GERENTE, ROLES.ADMINISTRADOR)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.loteService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('LOTE_ACTUALIZAR', 'Lote')
  update(
    @Param('id') id: string,
    @Body() updateLoteDto: UpdateLoteDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.update(+id, updateLoteDto, tenant);
  }

  @Patch(':id/finalizar')
  @Roles(ROLES.RESPONSABLE_CALIDAD)
  @AuditLog('LOTE_FINALIZAR', 'Lote')
  finalizar(
    @Param('id') id: string,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.loteService.finalizar(+id, tenant);
  }
}