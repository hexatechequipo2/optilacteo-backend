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
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CurrentEmpresa } from '../../common/decorators/current-empresa.decorator';
import {
  AuthenticatedOnly,
  Permissions,
} from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { UpdateIdentidadEmpresaDto } from './dto/update-identidad-empresa.dto';
import { ToggleModuloDto } from './dto/toggle-modulo.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { TipoAccion } from '../audit/enums/tipo-accion.enum';
import { EmpresaFilterQueryDto } from './dto/empresa-filter-query.dto';
import { multerLogoOptions } from './config/multer-logo.config';

@ApiTags('empresa')
@ApiBearerAuth()
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.CREATE)
  @AuditLog('EMPRESA_CREAR', 'Empresa', TipoAccion.ALTA)
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresaService.create(createEmpresaDto);
  }

  @Get()
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.READ)
  findAll(@Query() query: EmpresaFilterQueryDto) {
    return this.empresaService.findAll(query);
  }

  @Get('me')
  @AuthenticatedOnly()
  findMine(@CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.findMine(tenant);
  }

  @Patch('me/identidad')
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.UPDATE,
  )
  @AuditLog('EMPRESA_IDENTIDAD_ACTUALIZAR', 'Empresa', TipoAccion.EDICION)
  updateIdentidad(
    @Body() dto: UpdateIdentidadEmpresaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.updateIdentidad(dto, tenant);
  }

  @Post('me/logo')
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.UPDATE,
  )
  @AuditLog('EMPRESA_LOGO_SUBIR', 'Empresa', TipoAccion.EDICION)
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

  // HU-12: eliminar logo.
  @Delete('me/logo')
  @Permissions(
    ModuloAdministrativo.CONFIGURACION_EMPRESA,
    PermissionAction.UPDATE,
  )
  @AuditLog('EMPRESA_LOGO_ELIMINAR', 'Empresa', TipoAccion.EDICION)
  deleteLogo(@CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.deleteLogo(tenant);
  }

  @Get(':id')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.findOne(+id, tenant);
  }

  @Patch(':id')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  @AuditLog('EMPRESA_ACTUALIZAR', 'Empresa', TipoAccion.EDICION)
  update(
    @Param('id') id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.update(+id, updateEmpresaDto, tenant);
  }

  @Patch(':id/activar')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  @AuditLog('EMPRESA_ACTIVAR', 'Empresa', TipoAccion.ALTA)
  activate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.activate(+id, tenant);
  }

  @Patch(':id/desactivar')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  @AuditLog('EMPRESA_DESACTIVAR', 'Empresa', TipoAccion.BAJA)
  deactivate(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.deactivate(+id, tenant);
  }

  @Patch(':id/modulos/activar')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  @AuditLog('MODULO_ACTIVAR', 'Empresa', TipoAccion.CONFIGURACION)
  activarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.activarModulo(+id, dto, tenant);
  }

  @Patch(':id/modulos/desactivar')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  @AuditLog('MODULO_DESACTIVAR', 'Empresa', TipoAccion.CONFIGURACION)
  desactivarModulo(
    @Param('id') id: string,
    @Body() dto: ToggleModuloDto,
    @CurrentEmpresa() tenant: TenantContext,
  ) {
    return this.empresaService.desactivarModulo(+id, dto, tenant);
  }

  @Delete(':id')
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.DELETE)
  @AuditLog('EMPRESA_ELIMINAR', 'Empresa', TipoAccion.BAJA)
  remove(@Param('id') id: string, @CurrentEmpresa() tenant: TenantContext) {
    return this.empresaService.remove(+id, tenant);
  }
}
