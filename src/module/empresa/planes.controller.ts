import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../user/enums/role.enum';
import { EmpresaService } from './empresa.service';

@ApiTags('planes')
@Controller('planes')
export class PlanesController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.empresaService.getResumenPlanes();
  }
}