import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Empresa } from '../entities/empresa.entity';
import { EmpresaModulo } from '../entities/empresa-modulo.entity';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { IEmpresaRepository } from './empresa-repository.interface';

@Injectable()
export class EmpresaRepository implements IEmpresaRepository {
  constructor(
    @InjectRepository(Empresa)
    private readonly repository: Repository<Empresa>,
    @InjectRepository(EmpresaModulo)
    private readonly moduloRepository: Repository<EmpresaModulo>,
  ) {}

  async findById(id: number): Promise<Empresa | null> {
    return this.repository.findOne({
      where: { id },
      relations: { users: true, modulos: true },
    });
  }

  async findByCuit(cuit: string): Promise<Empresa | null> {
    return this.repository.findOneBy({ cuit });
  }

  async findAll(): Promise<Empresa[]> {
    return this.repository.find({ relations: { modulos: true, users: true } });
  }

  async findAllPaginated(skip: number, take: number): Promise<[Empresa[], number]> {
    return this.repository.findAndCount({
      relations: { modulos: true, users: true },
      order: { id: 'ASC' },
      skip,
      take,
    });
  }

  async createEmpresa(empresa: Partial<Empresa>): Promise<Empresa> {
    const newEmpresa = this.repository.create(empresa);
    return this.repository.save(newEmpresa);
  }

  async updateEmpresa(id: number, empresa: Partial<Empresa>): Promise<Empresa> {
    await this.repository.update(id, empresa);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Empresa with id ${id} not found after update`);
    }
    return updated;
  }

  async deleteEmpresa(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async hasActiveUsers(id: number): Promise<boolean> {
    const empresa = await this.findById(id);
    if (!empresa?.users) return false;
    return empresa.users.some((user) => user.isActive);
  }

  async createModulos(modulos: Partial<EmpresaModulo>[]): Promise<EmpresaModulo[]> {
    const nuevos = this.moduloRepository.create(modulos);
    return this.moduloRepository.save(nuevos);
  }

  async findModulo(empresaId: number, modulo: ModuloSistema): Promise<EmpresaModulo | null> {
    return this.moduloRepository.findOne({
      where: { empresa: { id: empresaId }, modulo },
      relations: { empresa: true },
    });
  }

  async updateModulo(id: number, isActive: boolean): Promise<EmpresaModulo> {
    await this.moduloRepository.update(id, { isActive });
    const updated = await this.moduloRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`EmpresaModulo with id ${id} not found after update`);
    }
    return updated;
  }

  async syncModulos(empresaId: number, modulosNuevoPlan: ModuloSistema[]): Promise<void> {
    // 1. Traer los módulos actuales de la empresa
    const modulosActuales = await this.moduloRepository.find({
      where: { empresa: { id: empresaId } },
    });

    const modulosActualesCodigos = modulosActuales.map((m) => m.modulo);

    // 2. Activar (crear) los módulos del nuevo plan que la empresa no tenía
    const modulosAAgregar = modulosNuevoPlan.filter(
      (m) => !modulosActualesCodigos.includes(m),
    );

    if (modulosAAgregar.length > 0) {
      const nuevos = this.moduloRepository.create(
        modulosAAgregar.map((modulo) => ({
          modulo,
          isActive: true,
          empresa: { id: empresaId } as Empresa,
        })),
      );
      await this.moduloRepository.save(nuevos);
    }

    // 3. Desactivar los módulos que la empresa tenía pero el nuevo plan ya no incluye
    const modulosAQuitar = modulosActuales.filter(
      (m) => !modulosNuevoPlan.includes(m.modulo),
    );

    if (modulosAQuitar.length > 0) {
      await this.moduloRepository.update(
        { id: In(modulosAQuitar.map((m) => m.id)) },
        { isActive: false },
      );
    }

    // 4. Reactivar los módulos que el nuevo plan sí incluye pero estaban
    // desactivados manualmente (por ejemplo, si venían de un downgrade previo)
    const modulosAReactivar = modulosActuales.filter(
      (m) => modulosNuevoPlan.includes(m.modulo) && !m.isActive,
    );

    if (modulosAReactivar.length > 0) {
      await this.moduloRepository.update(
        { id: In(modulosAReactivar.map((m) => m.id)) },
        { isActive: true },
      );
    }
  }
}