import 'multer'; 
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { UpdateIdentidadEmpresaDto } from './dto/update-identidad-empresa.dto';
import { ToggleModuloDto } from './dto/toggle-modulo.dto';
import { ROLES } from '../rol/constants/roles.constants';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { EmpresaFilterQueryDto } from './dto/empresa-filter-query.dto';
import { multerLogoOptions } from './config/multer-logo.config';

@ApiTags('empresa')
@ApiBearerAuth()
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('EMPRESA_CREAR', 'Empresa')
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresaService.create(createEmpresaDto);
  }

  @Get()
  @Roles(ROLES.ADMINISTRADOR)
  findAll(@Query() query: EmpresaFilterQueryDto) {
    return this.empresaService.findAll(query);
  }

  @Get('me')
  findMine(@CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.findMine(tenant);
  }

  @Patch('me/identidad')
  @Roles(ROLES.GERENTE)
  @AuditLog('EMPRESA_IDENTIDAD_ACTUALIZAR', 'Empresa')
  updateIdentidad(
    @Body() dto: UpdateIdentidadEmpresaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.updateIdentidad(dto, tenant);
  }

  @Post('me/logo')
  @Roles(ROLES.GERENTE)
  @AuditLog('EMPRESA_LOGO_SUBIR', 'Empresa')
  @UseInterceptors(FileInterceptor('logo', multerLogoOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadLogo(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(png|jpe?g)$/ })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.uploadLogo(file, tenant);
  }

  // HU-12: eliminar logo — solo Gerente.
  @Delete('me/logo')
  @Roles(ROLES.GERENTE)
  @AuditLog('EMPRESA_LOGO_ELIMINAR', 'Empresa')
  deleteLogo(@CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.deleteLogo(tenant);
  }

  @Get(':id')
  @Roles(ROLES.ADMINISTRADOR)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('EMPRESA_ACTUALIZAR', 'Empresa')
  update(
    @Param('id') id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.update(+id, updateEmpresaDto, tenant);
  }

  @Patch(':id/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('EMPRESA_ACTIVAR', 'Empresa')
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.activate(+id, tenant);
  }

  @Patch(':id/desactivar')
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('EMPRESA_DESACTIVAR', 'Empresa')
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.deactivate(+id, tenant);
  }

  @Patch(':id/modulos/activar')
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('MODULO_ACTIVAR', 'Empresa')
  activarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.activarModulo(+id, dto, tenant);
  }

  @Patch(':id/modulos/desactivar')
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('MODULO_DESACTIVAR', 'Empresa')
  desactivarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.desactivarModulo(+id, dto, tenant);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  @AuditLog('EMPRESA_ELIMINAR', 'Empresa')
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.remove(+id, tenant);
  }
}