import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repository/user.repository';
import { USER_REPOSITORY } from './repository/user-repository.interface';
import { Empresa } from '../empresa/entities/empresa.entity';
import { EmpresaModule } from '../empresa/empresa.module';
import { Rol } from '../rol/entities/rol.entity';
import { RolModule } from '../rol/rol.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Empresa, Rol]), 
    EmpresaModule,
    RolModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}