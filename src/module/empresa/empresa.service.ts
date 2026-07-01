import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TenantContext } from '../../common/types/tenant-context.type';
import type { IEmpresaRepository } from './repository/empresa-repository.interface';
import { EMPRESA_REPOSITORY } from './repository/empresa-repository.interface';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ToggleModuloDto } from './dto/toggle-modulo.dto';
import { EmpresaMapper } from './mappers/empresa.mapper';
import { DETALLE_POR_PLAN } from './config/plan-detalles.config';
import { ModuloSistema } from './enums/modulo-sistema.enum';
import { Plan } from './enums/plan.enum';

const PLAN_NOMBRES: Record<Plan, string> = {
  [Plan.STARTER]: 'Starter',
  [Plan.PRO]: 'Pro',
  [Plan.ENTERPRISE]: 'Enterprise',
};

const MODULO_NOMBRES: Record<ModuloSistema, string> = {
  [ModuloSistema.DASHBOARD]: 'Dashboard',
  [ModuloSistema.RECEPCION]: 'Recepción',
  [ModuloSistema.DESTINO_PRODUCTIVO_IA]: 'Destino productivo (IA)',
  [ModuloSistema.MONITOREO_ALERTAS]: 'Monitoreo y alertas',
  [ModuloSistema.SENSORES_IOT]: 'Sensores IoT',
  [ModuloSistema.TRAZABILIDAD]: 'Trazabilidad',
  [ModuloSistema.REPORTES_FORECAST]: 'Reportes y forecast',
  [ModuloSistema.ASISTENTE_VOZ]: 'Asistente de voz',
};

@Injectable()
export class EmpresaService {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: IEmpresaRepository,
  ) {}

  async create(dto: CreateEmpresaDto) {
    const empresaToCreate = EmpresaMapper.toEntity(dto);
    const created = await this.empresaRepository.createEmpresa(empresaToCreate);

    const modulosDelPlan = DETALLE_POR_PLAN[created.plan].modulos;
    await this.empresaRepository.createModulos(
      modulosDelPlan.map((modulo) => ({
        modulo,
        isActive: true,
        empresa: created,
      })),
    );

    const empresaConModulos = await this.empresaRepository.findById(created.id);
    return EmpresaMapper.toResponse(empresaConModulos!);
  }

  async findAll() {
    const empresas = await this.empresaRepository.findAll();
    return EmpresaMapper.toResponseList(empresas);
  }

  async findOne(id: number, tenant: TenantContext) {
    this.assertOwnEmpresa(id, tenant);
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${id} no encontrada`);
    }
    return EmpresaMapper.toResponse(empresa);
  }

  // Cualquier usuario autenticado puede ver los datos de su propia empresa,
  // sin necesitar el rol admin que exige GET /empresa. Un admin no tiene
  // empresa propia, por eso no aplica acá.
  async findMine(tenant: TenantContext) {
    if (tenant.empresaId === null) {
      throw new NotFoundException('Los usuarios admin no tienen una empresa asociada');
    }
    return this.findOne(tenant.empresaId, tenant);
  }

  async update(id: number, dto: UpdateEmpresaDto, tenant: TenantContext) {
    this.assertOwnEmpresa(id, tenant);
    await this.findOne(id, tenant);

    const empresaToUpdate = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.cuit !== undefined && { cuit: dto.cuit }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.telefono !== undefined && { telefono: dto.telefono }),
      ...(dto.direccion !== undefined && { direccion: dto.direccion }),
      ...(dto.plan !== undefined && { plan: dto.plan }),
    };

    const updated = await this.empresaRepository.updateEmpresa(id, empresaToUpdate);
    return EmpresaMapper.toResponse(updated);
  }

  async deactivate(id: number, tenant: TenantContext) {
    this.assertOwnEmpresa(id, tenant);
    await this.findOne(id, tenant);

    const tieneUsuariosActivos = await this.empresaRepository.hasActiveUsers(id);
    if (tieneUsuariosActivos) {
      throw new ConflictException(
        'No se puede desactivar una empresa que tiene usuarios activos asociados',
      );
    }

    const updated = await this.empresaRepository.updateEmpresa(id, { isActive: false });
    return EmpresaMapper.toResponse(updated);
  }

  async activate(id: number, tenant: TenantContext) {
    this.assertOwnEmpresa(id, tenant);
    await this.findOne(id, tenant);
    const updated = await this.empresaRepository.updateEmpresa(id, { isActive: true });
    return EmpresaMapper.toResponse(updated);
  }

  async remove(id: number, tenant: TenantContext) {
    return this.deactivate(id, tenant);
  }

  async activarModulo(empresaId: number, dto: ToggleModuloDto, tenant: TenantContext) {
    this.assertOwnEmpresa(empresaId, tenant);
    return this.toggleModulo(empresaId, dto.modulo, true);
  }

  async desactivarModulo(empresaId: number, dto: ToggleModuloDto, tenant: TenantContext) {
    this.assertOwnEmpresa(empresaId, tenant);
    return this.toggleModulo(empresaId, dto.modulo, false);
  }

  // A diferencia de Proveedor (que tiene su propia columna empresaId), acá
  // el id de la propia Empresa ES el identificador del tenant: se compara
  // directo contra tenant.empresaId. Devuelve 403 (no 404) porque así se
  // definió explícitamente para este módulo -- a diferencia de Proveedor, acá
  // no se prioriza ocultar la existencia del id.
  private assertOwnEmpresa(id: number, tenant: TenantContext): void {
    if (tenant.isAdmin) {
      return;
    }
    if (tenant.empresaId !== id) {
      throw new ForbiddenException('No tiene permiso para acceder a esta empresa');
    }
  }

  /**
   * NUEVO: usado por UserService para validar el límite de usuarios
   * permitido según el plan de la empresa, antes de crear un usuario nuevo.
   */
  async getLimiteUsuarios(empresaId: number): Promise<number> {
    const empresa = await this.empresaRepository.findById(empresaId);
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${empresaId} no encontrada`);
    }
    return DETALLE_POR_PLAN[empresa.plan].maxUsuarios;
  }

  async getResumenPlanes() {
    const empresas = await this.empresaRepository.findAll();
    const planOrder = [Plan.STARTER, Plan.PRO, Plan.ENTERPRISE];

    return planOrder.map((plan, index) => {
      const detalle = DETALLE_POR_PLAN[plan];
      const count = empresas.filter((e) => e.plan === plan).length;
      return {
        id: index + 1,
        nombre: PLAN_NOMBRES[plan],
        precio: detalle.precioMensual,
        maxUsuarios: detalle.maxUsuarios,
        maxSensores: detalle.maxSensores,
        modulos: detalle.modulos.map((m) => ({ nombre: MODULO_NOMBRES[m], codigo: m })),
        empresasAsignadas: count,
        mrr: (detalle.precioMensual * count) / 1000,
      };
    });
  }

  private async toggleModulo(empresaId: number, modulo: ModuloSistema, activar: boolean) {
    const empresa = await this.empresaRepository.findById(empresaId);
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${empresaId} no encontrada`);
    }

    const modulosPermitidos = DETALLE_POR_PLAN[empresa.plan].modulos;
    if (activar && !modulosPermitidos.includes(modulo)) {
      throw new BadRequestException(
        `El módulo "${modulo}" no está disponible en el plan "${empresa.plan}"`,
      );
    }

    const empresaModulo = await this.empresaRepository.findModulo(empresaId, modulo);
    if (!empresaModulo) {
      throw new NotFoundException(
        `El módulo "${modulo}" no está asignado a la empresa con id ${empresaId}`,
      );
    }

    const updated = await this.empresaRepository.updateModulo(empresaModulo.id, activar);
    return { modulo: updated.modulo, isActive: updated.isActive };
  }
}