import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import { ModuloAdministrativo } from '../permiso/enums/modulo-administrativo.enum';
import { EmpresaService } from './empresa.service';

@ApiTags('planes')
@ApiBearerAuth()
@Controller('planes')
export class PlanesController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.READ)
  findAll() {
    return this.empresaService.getResumenPlanes();
  }
}
