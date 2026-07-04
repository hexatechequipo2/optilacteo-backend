import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmpresaService } from './empresa.service';
import { ROLES } from '../rol/constants/roles.constants';

@ApiTags('planes')
@Controller('planes')
export class PlanesController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Roles(ROLES.ADMINISTRADOR)
  @Get()
  findAll() {
    return this.empresaService.getResumenPlanes();
  }
}