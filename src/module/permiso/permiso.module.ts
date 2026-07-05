import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisoService } from './permiso.service';
import { PermisoController } from './permiso.controller';
import { PermisoRepository } from './repository/permiso.repository';
import { PERMISO_REPOSITORY } from './repository/permiso-interface.repository';
import { PermisoModulo } from './entities/permiso-modulo.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PermisoModulo, User])],
  controllers: [PermisoController],
  providers: [
    PermisoService,
    {
      provide: PERMISO_REPOSITORY,
      useClass: PermisoRepository,
    },
  ],
  exports: [PermisoService],
})
export class PermisoModule {}