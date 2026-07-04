import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';
import { Rol } from './entities/rol.entity';
import { PermisoModulo } from '../permiso/entities/permiso-modulo.entity';
import { RolRepository } from './repository/rol.repository';
import { ROL_REPOSITORY } from './repository/rol-interface.repository';
import { Empresa } from '../empresa/entities/empresa.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, PermisoModulo, Empresa, User])],
  controllers: [RolController],
  providers: [
    RolService,
    {
      provide: ROL_REPOSITORY,
      useClass: RolRepository,
    },
  ],
  exports: [
    RolService,
    ROL_REPOSITORY,   // <-- agregar esto
  ],
})
export class RolModule {}