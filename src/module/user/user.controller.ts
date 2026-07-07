import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../rol/constants/roles.constants';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('user')       
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id/activar')
  activate(@Param('id') id: string) {
    return this.userService.activate(+id);
  }
  
  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string) {
    return this.userService.deactivate(+id);
  }

  @Roles(ROLES.GERENTE, ROLES.ADMINISTRADOR)
  @Delete(':id')
  deactivateById(@Param('id') id: string) {
    return this.userService.deactivate(+id);
  }
}
