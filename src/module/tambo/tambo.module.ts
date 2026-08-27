import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TamboService } from './tambo.service';
import { TamboController } from './tambo.controller';
import { Tambo } from './entities/tambo.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { TamboRepository } from './repository/tambo.repository';
import { TAMBO_REPOSITORY } from './repository/tambo-interface.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Tambo, Proveedor])],
  controllers: [TamboController],
  providers: [
    TamboService,
    {
      provide: TAMBO_REPOSITORY,
      useClass: TamboRepository,
    },
  ],
  // Se exporta TAMBO_REPOSITORY además de TamboService porque LoteModule
  // sigue inyectando el repositorio de Tambo directo (@InjectRepository)
  // vía su propio TypeOrmModule.forFeature([Tambo]) — no depende de este
  // export. Se deja exportado igual por si algún otro módulo necesita
  // reusar la interfaz en vez de duplicar TypeOrmModule.forFeature([Tambo]).
  exports: [TamboService, TAMBO_REPOSITORY],
})
export class TamboModule {}