import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaService } from '../empresa.service';
import { EMPRESA_REPOSITORY } from '../repository/empresa-repository.interface';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';
import { Plan } from '../enums/plan.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { DETALLE_POR_PLAN } from '../config/plan-detalles.config';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

// HU-10 (aislamiento multi-tenant vía assertOwnEmpresa/404) ya está cubierta
// en empresa-tenant-isolation.service.spec.ts. Este archivo se enfoca en las
// reglas de negocio de HU-08: alta, edición, activación/desactivación y
// habilitación de módulos según el plan.

const tenantAdmin: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

const empresaBase = {
  id: 1,
  name: 'Lacteos Norte',
  cuit: '30-12345678-9',
  email: 'contacto@lacteosnorte.com',
  telefono: '+54 351 1234567',
  direccion: 'Av. Siempreviva 742, Córdoba',
  plan: Plan.STARTER,
  isActive: true,
  users: [],
  modulos: [],
};

describe('EmpresaService', () => {
  let service: EmpresaService;
  let mockEmpresaRepository: {
    findById: jest.Mock;
    findByCuit: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    createEmpresa: jest.Mock;
    updateEmpresa: jest.Mock;
    deleteEmpresa: jest.Mock;
    hasActiveUsers: jest.Mock;
    createModulos: jest.Mock;
    findModulo: jest.Mock;
    updateModulo: jest.Mock;
    syncModulos: jest.Mock;
  };

  beforeEach(async () => {
    mockEmpresaRepository = {
      findById: jest.fn(),
      findByCuit: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      createEmpresa: jest.fn(),
      updateEmpresa: jest.fn(),
      deleteEmpresa: jest.fn(),
      hasActiveUsers: jest.fn(),
      createModulos: jest.fn(),
      findModulo: jest.fn(),
      updateModulo: jest.fn(),
      syncModulos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaService,
        { provide: EMPRESA_REPOSITORY, useValue: mockEmpresaRepository },
      ],
    }).compile();

    service = module.get<EmpresaService>(EmpresaService);
  });

  describe('create - alta de empresa', () => {
    it('deberia dar de alta una empresa con nombre, CUIT y datos de contacto validos', async () => {
      // Arrange
      const dto: CreateEmpresaDto = {
        name: 'Lacteos Norte',
        cuit: '30-12345678-9',
        email: 'contacto@lacteosnorte.com',
        telefono: '+54 351 1234567',
        direccion: 'Av. Siempreviva 742, Córdoba',
        plan: Plan.STARTER,
      };
      const empresaCreada = { ...empresaBase };
      mockEmpresaRepository.createEmpresa.mockResolvedValue(empresaCreada);
      mockEmpresaRepository.createModulos.mockResolvedValue([]);
      mockEmpresaRepository.findById.mockResolvedValue(empresaCreada);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockEmpresaRepository.createEmpresa).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Lacteos Norte',
          cuit: '30-12345678-9',
          email: 'contacto@lacteosnorte.com',
          telefono: '+54 351 1234567',
          direccion: 'Av. Siempreviva 742, Córdoba',
          plan: Plan.STARTER,
        }),
      );
      expect(result.name).toBe('Lacteos Norte');
      expect(result.cuit).toBe('30-12345678-9');
      expect(result.plan).toBe(Plan.STARTER);
    });

    it.each([Plan.STARTER, Plan.PRO, Plan.ENTERPRISE])(
      'deberia asignar el plan %s y habilitar automaticamente sus modulos correspondientes',
      async (plan) => {
        // Arrange
        const dto: CreateEmpresaDto = { name: 'Empresa Test', cuit: '30-99999999-9', plan };
        const empresaCreada = { ...empresaBase, id: 5, plan };
        mockEmpresaRepository.createEmpresa.mockResolvedValue(empresaCreada);
        mockEmpresaRepository.createModulos.mockResolvedValue([]);
        mockEmpresaRepository.findById.mockResolvedValue(empresaCreada);

        // Act
        const result = await service.create(dto);

        // Assert
        expect(result.plan).toBe(plan);
        expect(mockEmpresaRepository.createModulos).toHaveBeenCalledWith(
          DETALLE_POR_PLAN[plan].modulos.map((modulo) =>
            expect.objectContaining({ modulo, isActive: true }),
          ),
        );
      },
    );

    it('deberia usar el plan Starter por defecto cuando el DTO no especifica otro (segun default de CreateEmpresaDto)', async () => {
      // Arrange
      const dto = new CreateEmpresaDto();
      dto.name = 'Empresa Sin Plan Explicito';
      const empresaCreada = { ...empresaBase, plan: Plan.STARTER };
      mockEmpresaRepository.createEmpresa.mockResolvedValue(empresaCreada);
      mockEmpresaRepository.createModulos.mockResolvedValue([]);
      mockEmpresaRepository.findById.mockResolvedValue(empresaCreada);

      // Act
      await service.create(dto);

      // Assert
      expect(mockEmpresaRepository.createModulos).toHaveBeenCalledWith(
        DETALLE_POR_PLAN[Plan.STARTER].modulos.map((modulo) =>
          expect.objectContaining({ modulo, isActive: true }),
        ),
      );
    });

    it('deberia rechazar el alta con ConflictException si el CUIT ya esta registrado por otra empresa', async () => {
      // Arrange
      const dto: CreateEmpresaDto = {
        name: 'Lacteos Norte',
        cuit: '30-12345678-9',
        plan: Plan.STARTER,
      };
      mockEmpresaRepository.findByCuit.mockResolvedValue(empresaBase);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockEmpresaRepository.findByCuit).toHaveBeenCalledWith('30-12345678-9');
      expect(mockEmpresaRepository.createEmpresa).not.toHaveBeenCalled();
    });
  });

  describe('update - edicion de empresa', () => {
    it('deberia editar exitosamente los datos de una empresa existente', async () => {
      // Arrange
      const empresaActual = { ...empresaBase };
      const empresaActualizada = { ...empresaBase, name: 'Lacteos Norte S.A.' };
      mockEmpresaRepository.findById
        .mockResolvedValueOnce(empresaActual)
        .mockResolvedValueOnce(empresaActualizada);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue(empresaActualizada);

      // Act
      const result = await service.update(1, { name: 'Lacteos Norte S.A.' }, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Lacteos Norte S.A.' }),
      );
      expect(result.name).toBe('Lacteos Norte S.A.');
    });

    it('deberia rechazar la edicion con NotFoundException cuando la empresa no existe', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(999, { name: 'No existe' }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('deberia sincronizar los modulos cuando el plan cambia', async () => {
      // Arrange
      const empresaActual = { ...empresaBase, plan: Plan.STARTER };
      const empresaActualizada = { ...empresaBase, plan: Plan.PRO };
      mockEmpresaRepository.findById
        .mockResolvedValueOnce(empresaActual)
        .mockResolvedValueOnce(empresaActualizada);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue(empresaActualizada);

      // Act
      await service.update(1, { plan: Plan.PRO }, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.syncModulos).toHaveBeenCalledWith(
        1,
        DETALLE_POR_PLAN[Plan.PRO].modulos,
      );
    });

    it('NO deberia sincronizar modulos cuando el plan no cambia', async () => {
      // Arrange
      const empresaActual = { ...empresaBase, plan: Plan.STARTER };
      mockEmpresaRepository.findById
        .mockResolvedValueOnce(empresaActual)
        .mockResolvedValueOnce(empresaActual);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue(empresaActual);

      // Act
      await service.update(1, { plan: Plan.STARTER, telefono: '+54 111' }, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.syncModulos).not.toHaveBeenCalled();
    });

    it('deberia rechazar la edicion con ConflictException si el nuevo CUIT ya esta en uso por otra empresa', async () => {
      // Arrange
      const empresaActual = { ...empresaBase };
      mockEmpresaRepository.findById.mockResolvedValue(empresaActual);
      mockEmpresaRepository.findByCuit.mockResolvedValue({ ...empresaBase, id: 2 });

      // Act & Assert
      await expect(
        service.update(1, { cuit: '20-99999999-9' }, tenantAdmin),
      ).rejects.toThrow(ConflictException);
      expect(mockEmpresaRepository.findByCuit).toHaveBeenCalledWith('20-99999999-9');
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('NO deberia chequear duplicado de CUIT si el valor enviado es el mismo que ya tenia la empresa', async () => {
      // Arrange
      const empresaActual = { ...empresaBase };
      mockEmpresaRepository.findById
        .mockResolvedValueOnce(empresaActual)
        .mockResolvedValueOnce(empresaActual);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue(empresaActual);

      // Act
      await service.update(1, { cuit: empresaActual.cuit }, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.findByCuit).not.toHaveBeenCalled();
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalled();
    });
  });

  describe('activate / deactivate - impacto en el acceso de usuarios', () => {
    it('deberia rechazar la desactivacion con ConflictException si la empresa tiene usuarios activos', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(empresaBase);
      mockEmpresaRepository.hasActiveUsers.mockResolvedValue(true);

      // Act & Assert
      await expect(service.deactivate(1, tenantAdmin)).rejects.toThrow(ConflictException);
      expect(mockEmpresaRepository.updateEmpresa).not.toHaveBeenCalled();
    });

    it('deberia desactivar la empresa cuando no tiene usuarios activos', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(empresaBase);
      mockEmpresaRepository.hasActiveUsers.mockResolvedValue(false);
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({
        ...empresaBase,
        isActive: false,
      });

      // Act
      const result = await service.deactivate(1, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(1, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('deberia reactivar una empresa desactivada', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({ ...empresaBase, isActive: false });
      mockEmpresaRepository.updateEmpresa.mockResolvedValue({
        ...empresaBase,
        isActive: true,
      });

      // Act
      const result = await service.activate(1, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.updateEmpresa).toHaveBeenCalledWith(1, { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('deberia lanzar NotFoundException al desactivar una empresa que no existe', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deactivate(999, tenantAdmin)).rejects.toThrow(NotFoundException);
      expect(mockEmpresaRepository.hasActiveUsers).not.toHaveBeenCalled();
    });

    it('deberia lanzar NotFoundException al activar una empresa que no existe', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.activate(999, tenantAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activarModulo - limites del plan asignado', () => {
    it('deberia rechazar con BadRequestException la activacion de un modulo fuera del plan actual', async () => {
      // Arrange: empresa Starter (solo dashboard/recepcion) intentando activar sensores_iot (solo Pro/Enterprise)
      mockEmpresaRepository.findById.mockResolvedValue({ ...empresaBase, plan: Plan.STARTER });

      // Act & Assert
      await expect(
        service.activarModulo(1, { modulo: ModuloSistema.SENSORES_IOT }, tenantAdmin),
      ).rejects.toThrow(BadRequestException);
      expect(mockEmpresaRepository.findModulo).not.toHaveBeenCalled();
    });

    it('deberia activar correctamente un modulo incluido en el plan actual', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({ ...empresaBase, plan: Plan.STARTER });
      mockEmpresaRepository.findModulo.mockResolvedValue({
        id: 10,
        modulo: ModuloSistema.RECEPCION,
        isActive: false,
      });
      mockEmpresaRepository.updateModulo.mockResolvedValue({
        id: 10,
        modulo: ModuloSistema.RECEPCION,
        isActive: true,
      });

      // Act
      const result = await service.activarModulo(1, { modulo: ModuloSistema.RECEPCION }, tenantAdmin);

      // Assert
      expect(mockEmpresaRepository.updateModulo).toHaveBeenCalledWith(10, true);
      expect(result).toEqual({ modulo: ModuloSistema.RECEPCION, isActive: true });
    });

    it('deberia lanzar NotFoundException si el modulo del plan aun no fue asignado a la empresa', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({ ...empresaBase, plan: Plan.STARTER });
      mockEmpresaRepository.findModulo.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.activarModulo(1, { modulo: ModuloSistema.RECEPCION }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
      expect(mockEmpresaRepository.updateModulo).not.toHaveBeenCalled();
    });

    it('deberia lanzar NotFoundException si la empresa no existe', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.activarModulo(999, { modulo: ModuloSistema.DASHBOARD }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('desactivarModulo - sin restriccion de plan', () => {
    it('deberia permitir desactivar cualquier modulo ya asignado, sin chequear limites del plan', async () => {
      // Arrange: la regla de DETALLE_POR_PLAN solo se aplica al activar, no al desactivar
      mockEmpresaRepository.findById.mockResolvedValue({ ...empresaBase, plan: Plan.STARTER });
      mockEmpresaRepository.findModulo.mockResolvedValue({
        id: 11,
        modulo: ModuloSistema.SENSORES_IOT,
        isActive: true,
      });
      mockEmpresaRepository.updateModulo.mockResolvedValue({
        id: 11,
        modulo: ModuloSistema.SENSORES_IOT,
        isActive: false,
      });

      // Act
      const result = await service.desactivarModulo(
        1,
        { modulo: ModuloSistema.SENSORES_IOT },
        tenantAdmin,
      );

      // Assert
      expect(mockEmpresaRepository.updateModulo).toHaveBeenCalledWith(11, false);
      expect(result).toEqual({ modulo: ModuloSistema.SENSORES_IOT, isActive: false });
    });

    it('deberia lanzar NotFoundException si el modulo no esta asignado a la empresa', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(empresaBase);
      mockEmpresaRepository.findModulo.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.desactivarModulo(1, { modulo: ModuloSistema.DASHBOARD }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLimiteUsuarios', () => {
    it.each([
      [Plan.STARTER, DETALLE_POR_PLAN[Plan.STARTER].maxUsuarios],
      [Plan.PRO, DETALLE_POR_PLAN[Plan.PRO].maxUsuarios],
      [Plan.ENTERPRISE, DETALLE_POR_PLAN[Plan.ENTERPRISE].maxUsuarios],
    ])('deberia retornar el limite de usuarios del plan %s', async (plan, maxUsuarios) => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue({ ...empresaBase, plan });

      // Act
      const result = await service.getLimiteUsuarios(1);

      // Assert
      expect(result).toBe(maxUsuarios);
    });

    it('deberia lanzar NotFoundException si la empresa no existe', async () => {
      // Arrange
      mockEmpresaRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getLimiteUsuarios(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResumenPlanes', () => {
    it('deberia retornar los 3 planes con la cantidad de empresas asignadas', async () => {
      // Arrange
      mockEmpresaRepository.findAll.mockResolvedValue([
        { ...empresaBase, id: 1, plan: Plan.STARTER },
        { ...empresaBase, id: 2, plan: Plan.STARTER },
        { ...empresaBase, id: 3, plan: Plan.PRO },
      ]);

      // Act
      const result = await service.getResumenPlanes();

      // Assert
      expect(result).toHaveLength(3);
      const starter = result.find((p) => p.nombre === 'Starter')!;
      const pro = result.find((p) => p.nombre === 'Pro')!;
      const enterprise = result.find((p) => p.nombre === 'Enterprise')!;
      expect(starter.empresasAsignadas).toBe(2);
      expect(pro.empresasAsignadas).toBe(1);
      expect(enterprise.empresasAsignadas).toBe(0);
    });

    it('deberia incluir precio mensual y limites de usuarios/sensores de cada plan segun DETALLE_POR_PLAN', async () => {
      // Arrange
      mockEmpresaRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getResumenPlanes();

      // Assert
      const starter = result.find((p) => p.nombre === 'Starter')!;
      const pro = result.find((p) => p.nombre === 'Pro')!;
      const enterprise = result.find((p) => p.nombre === 'Enterprise')!;
      expect(starter.precio).toBe(DETALLE_POR_PLAN[Plan.STARTER].precioMensual);
      expect(starter.maxUsuarios).toBe(DETALLE_POR_PLAN[Plan.STARTER].maxUsuarios);
      expect(starter.maxSensores).toBe(DETALLE_POR_PLAN[Plan.STARTER].maxSensores);
      expect(pro.precio).toBe(DETALLE_POR_PLAN[Plan.PRO].precioMensual);
      expect(enterprise.precio).toBe(DETALLE_POR_PLAN[Plan.ENTERPRISE].precioMensual);
    });

    it('Starter deberia incluir solo Dashboard y Recepcion', async () => {
      // Arrange
      mockEmpresaRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getResumenPlanes();

      // Assert
      const starter = result.find((p) => p.nombre === 'Starter')!;
      expect(starter.modulos).toEqual([
        { nombre: 'Dashboard', codigo: ModuloSistema.DASHBOARD },
        { nombre: 'Recepción', codigo: ModuloSistema.RECEPCION },
      ]);
    });

    it('Enterprise deberia incluir los 8 modulos del sistema, incluido Asistente de voz', async () => {
      // Arrange
      mockEmpresaRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getResumenPlanes();

      // Assert
      const enterprise = result.find((p) => p.nombre === 'Enterprise')!;
      expect(enterprise.modulos).toHaveLength(8);
      expect(enterprise.modulos).toContainEqual({
        nombre: 'Asistente de voz',
        codigo: ModuloSistema.ASISTENTE_VOZ,
      });
      expect(enterprise.modulos.map((m) => m.codigo)).toEqual(
        expect.arrayContaining(Object.values(ModuloSistema)),
      );
    });

    it('Pro deberia incluir los modulos intermedios pero no Asistente de voz', async () => {
      // Arrange
      mockEmpresaRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getResumenPlanes();

      // Assert
      const pro = result.find((p) => p.nombre === 'Pro')!;
      expect(pro.modulos.map((m) => m.codigo)).not.toContain(ModuloSistema.ASISTENTE_VOZ);
      expect(pro.modulos).toHaveLength(7);
    });

  });
});
