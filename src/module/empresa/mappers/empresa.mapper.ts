import { Empresa } from '../entities/empresa.entity';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';
import { StorageService } from '../../../common/storage/storage.service';

export class EmpresaMapper {
  static toEntity(dto: CreateEmpresaDto): Partial<Empresa> {
    return {
      name: dto.name,
      cuit: dto.cuit,
      email: dto.email,
      telefono: dto.telefono,
      direccion: dto.direccion,
      plan: dto.plan,
    };
  }

  static toResponse(empresa: Empresa, storageService?: StorageService) {
    return {
      id: empresa.id,
      name: empresa.name,
      cuit: empresa.cuit ?? null,
      email: empresa.email ?? null,
      telefono: empresa.telefono ?? null,
      direccion: empresa.direccion ?? null,
      plan: empresa.plan,
      isActive: empresa.isActive,
      cantidadUsuarios: empresa.users?.length ?? 0,
      modulos: empresa.modulos?.map((m) => ({
        modulo: m.modulo,
        isActive: m.isActive,
      })) ?? [],
      logoUrl:
        empresa.logoPath && storageService
          ? storageService.getPublicUrl(empresa.logoPath)
          : null,
    };
  }

  static toResponseList(empresas: Empresa[], storageService?: StorageService) {
    return empresas.map((empresa) => this.toResponse(empresa, storageService));
  }
}