import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProveedoresService } from '../proveedores.service';
import { PROVEEDOR_REPOSITORY } from '../repository/proveedor-interface.repository';
import { ProveedorMapper } from '../mappers/proveedor.mapper';
import { Proveedor } from '../entities/proveedor.entity';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const tenantEmpresaA: TenantContext = { empresaId: 1, isAdmin: false };
const tenantAdmin: TenantContext = { empresaId: null, isAdmin: true };

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
    findById: jest.Mock;
    findByCuit: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    countByEmpresa: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCuit: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

  describe('findOne - lectura por id', () => {
    it('propaga NotFoundException cuando el repo no encuentra el proveedor para este tenant (id de otra empresa)', async () => {
      // El repo ya filtro por tenant y no matcheo nada -- simula que el id
      // pedido pertenece a la Empresa B mientras el usuario es de la A.
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(99, tenantEmpresaA)).rejects.toThrow(NotFoundException);
      expect(mockRepo.findById).toHaveBeenCalledWith(99, tenantEmpresaA);
    });
  });

  describe('create - resolucion de empresaId en el write-path', () => {
    it('para no-admin, ignora el empresaId del body y usa el de su JWT', async () => {
      const dto = buildCreateDto({ empresaId: 999 }); // intenta asignar a otra empresa
      mockRepo.findByCuit.mockResolvedValue(null);
      mockRepo.save.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      const result = await service.create(dto, tenantEmpresaA);

      expect(result.empresaId).toBe(1); // el de tenantEmpresaA, no 999
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ empresaId: 1 }),
      );
    });

    it('para no-admin sin empresaId en el body, igual usa el de su JWT', async () => {
      const dto = buildCreateDto();
      mockRepo.findByCuit.mockResolvedValue(null);
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
      mockRepo.save.mockImplementation((entity: Proveedor) => Promise.resolve(entity));

      const result = await service.create(dto, tenantAdmin);

      expect(result.empresaId).toBe(5);
    });
  });

  describe('update - write-path y TOCTOU', () => {
    it('para no-admin, ignora el empresaId del body al reasignar y fuerza el propio', async () => {
      mockRepo.findById.mockResolvedValue(buildProveedor());
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
      mockRepo.update.mockResolvedValue(null); // repo ya devuelve null cuando affected === 0

      await expect(
        service.update(10, { razonSocial: 'x' }, tenantEmpresaA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove - TOCTOU', () => {
    it('propaga NotFoundException si el id no pertenece a este tenant', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.remove(10, tenantEmpresaA)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('propaga NotFoundException si la query fisica de DELETE no borro filas (TOCTOU)', async () => {
      mockRepo.findById.mockResolvedValue(buildProveedor());
      mockRepo.delete.mockResolvedValue(false); // affected === 0

      await expect(service.remove(10, tenantEmpresaA)).rejects.toThrow(NotFoundException);
    });

    it('resuelve sin error cuando el proveedor existe para este tenant y se borra', async () => {
      mockRepo.findById.mockResolvedValue(buildProveedor());
      mockRepo.delete.mockResolvedValue(true);

      await expect(service.remove(10, tenantEmpresaA)).resolves.toBeUndefined();
    });
  });

  describe('resolveEmpresaId - caso limite', () => {
    it('lanza ForbiddenException si un no-admin llega sin empresa asociada (viola la regla de negocio)', async () => {
      const tenantSinEmpresa: TenantContext = { empresaId: null, isAdmin: false };
      const dto = buildCreateDto();

      await expect(service.create(dto, tenantSinEmpresa)).rejects.toThrow(ForbiddenException);
    });
  });
});
