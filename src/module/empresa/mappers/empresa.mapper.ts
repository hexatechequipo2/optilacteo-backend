import { Empresa } from '../entities/empresa.entity';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';

export class EmpresaMapper {
  static toEntity(dto: CreateEmpresaDto): Partial<Empresa> {
    return {
      name: dto.name,
      cuit: dto.cuit,
      email: dto.email,
      telefono: dto.telefono,
      direccion: dto.direccion,
    };
  }

  static toResponse(empresa: Empresa) {
    return {
      id: empresa.id,
      name: empresa.name,
      cuit: empresa.cuit ?? null,
      email: empresa.email ?? null,
      telefono: empresa.telefono ?? null,
      direccion: empresa.direccion ?? null,
      isActive: empresa.isActive,
      cantidadUsuarios: empresa.users?.length ?? 0,
    };
  }

  static toResponseList(empresas: Empresa[]) {
    return empresas.map((empresa) => this.toResponse(empresa));
  }
}