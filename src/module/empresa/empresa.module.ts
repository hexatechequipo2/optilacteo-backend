import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaService } from './empresa.service';
import { EmpresaController } from './empresa.controller';
import { Empresa } from './entities/empresa.entity';
import { EmpresaRepository } from './repository/empresa.repository';
import { EMPRESA_REPOSITORY } from './repository/empresa-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa])],
  controllers: [EmpresaController],
  providers: [
    EmpresaService,
    {
      provide: EMPRESA_REPOSITORY,
      useClass: EmpresaRepository,
    },
  ],
  exports: [EMPRESA_REPOSITORY],
})
export class EmpresaModule {}