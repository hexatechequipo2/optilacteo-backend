// module/rol/rol.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { PermisoModulo } from '../permiso/entities/permiso-modulo.entity';
import { Rol } from './entities/rol.entity';
import { RolController } from './rol.controller';
import { RolService } from './rol.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, User, PermisoModulo])],
  controllers: [RolController],
  providers: [RolService],
  exports: [RolService],
})
export class RolModule {}