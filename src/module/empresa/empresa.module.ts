import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaService } from './empresa.service';
import { EmpresaController } from './empresa.controller';
import { PlanesController } from './planes.controller';
import { Empresa } from './entities/empresa.entity';
import { EmpresaModulo } from './entities/empresa-modulo.entity';
import { EmpresaRepository } from './repository/empresa.repository';
import { EMPRESA_REPOSITORY } from './repository/empresa-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, EmpresaModulo])],
  controllers: [EmpresaController, PlanesController],
  providers: [
    EmpresaService,
    {
      provide: EMPRESA_REPOSITORY,
      useClass: EmpresaRepository,
    },
  ],
  exports: [EMPRESA_REPOSITORY, EmpresaService],
})
export class EmpresaModule {}