import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { ProveedoresController } from './proveedor.controller';
import { ProveedoresService } from './proveedor.service';
import { ProveedorRepository } from './repository/proveedor.repository';
import { PROVEEDOR_REPOSITORY } from './repository/proveedor-interface.repository';
import { ProveedorMapper } from './mappers/proveedor.mapper';

@Module({
  imports: [
    // Registra la entidad en TypeORM para este módulo
    TypeOrmModule.forFeature([Proveedor]),
  ],
  controllers: [ProveedoresController],
  providers: [
    ProveedoresService,
    ProveedorMapper,
    // Binding de la interfaz al token de inyección
    {
      provide: PROVEEDOR_REPOSITORY,
      useClass: ProveedorRepository,
    },
  ],
  // Exportar el servicio para que otros módulos puedan consumirlo
  // (por ejemplo, el módulo de Empresas para contar tambos asociados)
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
