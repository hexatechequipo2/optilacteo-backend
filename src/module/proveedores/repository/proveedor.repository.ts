import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TenantScopedRepository } from '../../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { Proveedor } from '../entities/proveedor.entity';
import { IProveedorRepository } from './proveedor-interface.repository';

@Injectable()
export class ProveedorRepository
  extends TenantScopedRepository<Proveedor>
  implements IProveedorRepository
{
  constructor(
    @InjectRepository(Proveedor)
    repo: Repository<Proveedor>,
  ) {
    super(repo);
  }

  async findAll(tenant: TenantContext): Promise<Proveedor[]> {
    return this.findAllScoped(tenant, { order: { razonSocial: 'ASC' } });
  }

  async findAllPaginated(
    tenant: TenantContext,
    skip: number,
    take: number,
  ): Promise<[Proveedor[], number]> {
    return this.findAllScopedPaginated(tenant, skip, take, {
      order: { razonSocial: 'ASC' },
    });
  }

  async findById(id: number, tenant: TenantContext): Promise<Proveedor | null> {
    return this.findByIdScoped(id, tenant);
  }

  // El CUIT tiene constraint UNIQUE global en la tabla (no por empresa),
  // por eso esta búsqueda no se filtra por tenant: la unicidad es del sistema.
  async findByCuit(cuit: string): Promise<Proveedor | null> {
    return this.repo.findOneBy({ cuit });
  }

  async save(proveedor: Proveedor): Promise<Proveedor> {
    return this.repo.save(proveedor);
  }

  // Filtra empresa_id en la propia sentencia UPDATE (no solo en el findById
  // previo del service) para que el chequeo de ownership sea atómico con la
  // escritura y no quede ventana entre "leer" y "escribir" (TOCTOU). Si
  // affected === 0, el filtro no matcheó ninguna fila (id inexistente o ya
  // no pertenece a esta empresa en el instante de la query) y se devuelve
  // null en vez de asumir éxito silencioso; el service decide el 404.
  async update(proveedor: Proveedor, tenant: TenantContext): Promise<Proveedor | null> {
    const { id, empresa, createdAt, updatedAt, ...columns } = proveedor;
    const result = await this.repo.update(
      this.scopedWhere(tenant, { id } as FindOptionsWhere<Proveedor>),
      columns,
    );
    if (!result.affected) {
      return null;
    }
    return this.repo.findOneBy({ id });
  }

  // Mismo criterio que update(): empresa_id va en el WHERE del DELETE físico,
  // y se informa si realmente borró algo (affected) en vez de asumir éxito.
  async delete(id: number, tenant: TenantContext): Promise<boolean> {
    const result = await this.repo.delete(
      this.scopedWhere(tenant, { id } as FindOptionsWhere<Proveedor>),
    );
    return !!result.affected;
  }

  async countByEmpresa(empresaId: number): Promise<number> {
    return this.repo.countBy({ empresaId });
  }
}