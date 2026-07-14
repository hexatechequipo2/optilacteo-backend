import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProveedoresService } from '../proveedor.service';
import { PROVEEDOR_REPOSITORY } from '../repository/proveedor-interface.repository';
import { ProveedorMapper } from '../mappers/proveedor.mapper';
import { Proveedor } from '../entities/proveedor.entity';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const tenantEmpresaA: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
const tenantAdmin: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

function buildProveedor(overrides: Partial<Proveedor> = {}): Proveedor {
  return {
    id: 10,
    razonSocial: 'Tambo El Sol',
    cuit: '20-12345678-9',
    telefono: null,
    emailContacto: null,
    tipo: TipoProveedor.TAMBO,
    provincia: null,
    localidad: null,
    capacidad: null,
    estado: EstadoProveedor.ACTIVA,
    empresaId: 1,
    empresa: undefined as never,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildCreateDto(overrides: Partial<CreateProveedorDto> = {}): CreateProveedorDto {
  return {
    razonSocial: 'Tambo El Sol',
    cuit: '20-12345678-9',
    tipo: TipoProveedor.TAMBO,
    ...overrides,
  };
}

describe('ProveedoresService - aislamiento multi-tenant', () => {
  let service: ProveedoresService;
  let mockRepo: {
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    findById: jest.Mock;
    findByCuit: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    setEstado: jest.Mock;
    countByEmpresa: jest.Mock;
    findByRazonSocial: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findByCuit: jest.fn(),
      findByRazonSocial: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      setEstado: jest.fn(),
      countByEmpresa: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        ProveedorMapper,
        { provide: PROVEEDOR_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProveedoresService>(ProveedoresService);
  });

describe('findAll - paginacion', () => {
    it('usa page=1 y limit=20 por defecto y calcula skip=0', async () => {
      mockRepo.findAllPaginated.mockResolvedValue([[buildProveedor()], 1]);

      const result = await service.findAll(tenantEmpresaA, { page: 1, limit: 20 });

      // Actualizamos el expect para incluir el cuarto parámetro { search, tipo }
      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantEmpresaA, 
        0, 
        20, 
        { search: undefined, tipo: undefined } // <--- AGREGA ESTO
      );
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('calcula el skip correctamente para paginas mayores a 1', async () => {
      mockRepo.findAllPaginated.mockResolvedValue([[], 45]);

      const result = await service.findAll(tenantEmpresaA, { page: 3, limit: 10 });

      // Actualizamos el expect aquí también
      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantEmpresaA, 
        20, 
        10, 
        { search: undefined, tipo: undefined } // <--- AGREGA ESTO
      );
      expect(result.meta).toEqual({ page: 3, limit: 10, total: 45, totalPages: 5 });
    });
  });

  describe('findOne - lectura por id', () => {
    it('propaga NotFoundException cuando el repo no encuentra el proveedor para este tenant (id de otra empresa)', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(99, tenantEmpresaA)).rejects.toThrow(NotFoundException);
      expect(mockRepo.findById).toHaveBeenCalledWith(99, tenantEmpresaA);
    });

    it('devuelve el proveedor mapeado cuando el repo lo encuentra', async () => {
      // Aseguramos que el proveedor mockeado tenga la relación empresa
      const proveedorMock = buildProveedor({ empresa: { id: 1 } as any });
      mockRepo.findById.mockResolvedValue(proveedorMock);

      const result = await service.findOne(10, tenantEmpresaA);

      expect(result.id).toBe(10);
      expect(result.razonSocial).toBe('Tambo El Sol');
    });
  });

  describe('create - resolucion de empresaId en el write-path', () => {
    it('para no-admin, ignora el empresaId del body y usa el de su JWT', async () => {
      const dto = buildCreateDto({ empresaId: 999 });
      mockRepo.findByCuit.mockResolvedValue(null);
      mockRepo.findByRazonSocial.mockResolvedValue(null);
      mockRepo.save.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      const result = await service.create(dto, tenantEmpresaA);

      expect(result.empresaId).toBe(1);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ empresaId: 1 }),
      );
    });

    it('para no-admin sin empresaId en el body, igual usa el de su JWT', async () => {
      const dto = buildCreateDto();
      mockRepo.findByCuit.mockResolvedValue(null);
      mockRepo.findByRazonSocial.mockResolvedValue(null);
      mockRepo.save.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      const result = await service.create(dto, tenantEmpresaA);

      expect(result.empresaId).toBe(1);
    });

    it('para admin, exige empresaId explicito en el body', async () => {
      const dto = buildCreateDto();

      await expect(service.create(dto, tenantAdmin)).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('para admin, usa el empresaId que mando explicito en el body', async () => {
      const dto = buildCreateDto({ empresaId: 5 });
      mockRepo.findByCuit.mockResolvedValue(null);
      mockRepo.findByRazonSocial.mockResolvedValue(null);
      mockRepo.save.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      const result = await service.create(dto, tenantAdmin);

      expect(result.empresaId).toBe(5);
    });

    it('lanza ConflictException si el CUIT ya esta registrado por otro proveedor', async () => {
      const dto = buildCreateDto();
      mockRepo.findByCuit.mockResolvedValue(buildProveedor());
      await expect(service.create(dto, tenantEmpresaA)).rejects.toThrow(ConflictException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update - write-path y TOCTOU', () => {
    it('para no-admin, ignora el empresaId del body al reasignar y fuerza el propio', async () => {
      // Agregamos empresa: { id: 1 } para pasar la validación assertOwnEmpresa
      mockRepo.findById.mockResolvedValue(buildProveedor({ empresa: { id: 1 } as any }));
      mockRepo.update.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      const result = await service.update(10, { empresaId: 999 }, tenantEmpresaA);

      expect(result.empresaId).toBe(1);
    });

    it('propaga NotFoundException si el id no pertenece a este tenant', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(10, { razonSocial: 'x' }, tenantEmpresaA),
      ).rejects.toThrow(NotFoundException);
    });

    it('propaga NotFoundException si la query fisica de UPDATE no afecto filas (TOCTOU: la fila cambio de empresa entre el check y el write)', async () => {
      mockRepo.findById.mockResolvedValue(buildProveedor());
      mockRepo.update.mockResolvedValue(null);

      await expect(
        service.update(10, { razonSocial: 'x' }, tenantEmpresaA),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si intenta cambiar el CUIT a uno ya usado por otro proveedor', async () => {
      // Agregamos empresa: { id: 1 } para pasar la validación assertOwnEmpresa
      mockRepo.findById.mockResolvedValue(buildProveedor({ empresa: { id: 1 } as any }));
      mockRepo.findByCuit.mockResolvedValue(buildProveedor({ id: 20, cuit: '27-11111111-1' }));

      await expect(
        service.update(10, { cuit: '27-11111111-1' }, tenantEmpresaA),
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('no valida el CUIT contra si mismo cuando el DTO manda el mismo CUIT que ya tiene', async () => {
      // Agregamos empresa: { id: 1 } para pasar la validación assertOwnEmpresa
      const proveedor = buildProveedor({ empresa: { id: 1 } as any });
      mockRepo.findById.mockResolvedValue(proveedor);
      mockRepo.update.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      await service.update(10, { cuit: proveedor.cuit }, tenantEmpresaA);

      expect(mockRepo.findByCuit).not.toHaveBeenCalled();
    });
  });

  describe('remove - soft delete (pasa a SUSPENDIDA) y TOCTOU', () => {
    it('propaga NotFoundException si el id no pertenece a este tenant', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.remove(10, tenantEmpresaA)).rejects.toThrow(NotFoundException);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    it('propaga NotFoundException si la query fisica de UPDATE (softDelete) no afecto filas (TOCTOU)', async () => {
      mockRepo.findById.mockResolvedValue(buildProveedor());
      mockRepo.softDelete.mockResolvedValue(false);

      await expect(service.remove(10, tenantEmpresaA)).rejects.toThrow(NotFoundException);
    });

    it('resuelve sin error cuando el proveedor existe para este tenant y pasa a SUSPENDIDA', async () => {
      // Agregamos la relación empresa para pasar assertOwnEmpresa
      mockRepo.findById.mockResolvedValue(buildProveedor({ empresa: { id: 1 } as any }));
      mockRepo.softDelete.mockResolvedValue(true);

      await expect(service.remove(10, tenantEmpresaA)).resolves.toBeUndefined();
      expect(mockRepo.softDelete).toHaveBeenCalledWith(10, tenantEmpresaA);
    });
  });

  describe('activate - reactiva un proveedor suspendido (vuelve a ACTIVA)', () => {
    it('propaga NotFoundException si el id no pertenece a este tenant', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.activate(10, tenantEmpresaA)).rejects.toThrow(NotFoundException);
      expect(mockRepo.setEstado).not.toHaveBeenCalled();
    });

    it('propaga NotFoundException si la query fisica de setEstado no afecto filas (TOCTOU)', async () => {
      mockRepo.findById.mockResolvedValue(buildProveedor({ estado: EstadoProveedor.SUSPENDIDA }));
      mockRepo.setEstado.mockResolvedValue(false);

      await expect(service.activate(10, tenantEmpresaA)).rejects.toThrow(NotFoundException);
    });

    it('fija el estado en ACTIVA y devuelve el proveedor recargado', async () => {
      // Ambos mocks de findById deben incluir la relación empresa
      mockRepo.findById
        .mockResolvedValueOnce(buildProveedor({ 
          estado: EstadoProveedor.SUSPENDIDA, 
          empresa: { id: 1 } as any 
        }))
        .mockResolvedValueOnce(buildProveedor({ 
          estado: EstadoProveedor.ACTIVA, 
          empresa: { id: 1 } as any 
        }));
      
      mockRepo.setEstado.mockResolvedValue(true);

      const result = await service.activate(10, tenantEmpresaA);

      expect(mockRepo.setEstado).toHaveBeenCalledWith(10, EstadoProveedor.ACTIVA, tenantEmpresaA);
      expect(result.estado).toBe(EstadoProveedor.ACTIVA);
    });
  });

  describe('resolveEmpresaId - caso limite', () => {
    it('lanza ForbiddenException si un no-admin llega sin empresa asociada (viola la regla de negocio)', async () => {
      const tenantSinEmpresa: TenantContext = { empresaId: null, rolNombre: ROLES.GERENTE };
      const dto = buildCreateDto();

      await expect(service.create(dto, tenantSinEmpresa)).rejects.toThrow(ForbiddenException);
    });
  });
});