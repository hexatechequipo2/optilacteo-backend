import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TamboService } from '../tambo.service';
import { TAMBO_REPOSITORY } from '../repository/tambo-interface.repository';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { EstadoProveedor } from '../../proveedores/enums/estado-proveedor.enum';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { CreateTamboDto } from '../dto/create-tambo.dto';
import { UpdateTamboDto } from '../dto/update-tambo.dto';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

describe('TamboService', () => {
  let service: TamboService;
  let tamboRepository: any;
  let proveedorRepository: jest.Mocked<Repository<Proveedor>>;

  const tenantValido: TenantContext = { empresaId: 10 } as TenantContext;

  const mockTamboRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAllByEmpresa: jest.fn(),
    findByProveedor: jest.fn(),
    findById: jest.fn(),
  };

  const mockProveedorRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TamboService,
        {
          provide: TAMBO_REPOSITORY,
          useValue: mockTamboRepository,
        },
        {
          provide: getRepositoryToken(Proveedor),
          useValue: mockProveedorRepository,
        },
      ],
    }).compile();

    service = module.get<TamboService>(TamboService);
    tamboRepository = module.get(TAMBO_REPOSITORY);
    proveedorRepository = module.get(getRepositoryToken(Proveedor));
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveEmpresaId', () => {
    it('debe lanzar BadRequestException si el tenant no contiene empresaId', async () => {
      const invalidTenant = {
        empresaId: undefined,
      } as unknown as TenantContext;

      await expect(service.findAll(invalidTenant)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    const dto: CreateTamboDto = {
      nombre: 'Tambo Las Acacias',
      proveedorId: 5,
      ubicacion: 'Luján',
    };

    it('debe crear un tambo exitosamente si el proveedor existe y está activo', async () => {
      const proveedor = {
        id: 5,
        empresaId: 10,
        razonSocial: 'Lácteos S.A.',
        estado: EstadoProveedor.ACTIVA,
      };

      const entity = { ...dto, empresaId: 10, activo: true };
      const savedEntity = { id: 1, ...entity };

      proveedorRepository.findOne.mockResolvedValue(proveedor as any);
      tamboRepository.create.mockReturnValue(entity);
      tamboRepository.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, tenantValido);

      expect(proveedorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5, empresaId: 10 },
      });
      expect(tamboRepository.create).toHaveBeenCalledWith({
        nombre: dto.nombre,
        ubicacion: dto.ubicacion,
        proveedorId: dto.proveedorId,
        empresaId: 10,
        activo: true,
      });
      expect(result.id).toBe(1);
    });

    it('debe arrojar NotFoundException si el proveedor no existe', async () => {
      proveedorRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, tenantValido)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe arrojar BadRequestException si el proveedor no está activo', async () => {
      const proveedorInactivo = {
        id: 5,
        razonSocial: 'Lácteos S.A.',
        estado: 'INACTIVA',
      };
      proveedorRepository.findOne.mockResolvedValue(proveedorInactivo as any);

      await expect(service.create(dto, tenantValido)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('debe listar los tambos asociados a la empresa', async () => {
      const tambosMock = [
        { id: 1, nombre: 'Tambo A', empresaId: 10, activo: true },
      ];
      tamboRepository.findAllByEmpresa.mockResolvedValue(tambosMock);

      const result = await service.findAll(tenantValido);

      expect(tamboRepository.findAllByEmpresa).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });
  });

  describe('findByProveedor', () => {
    it('debe retornar tambos filtrados por proveedor si el proveedor existe', async () => {
      proveedorRepository.findOne.mockResolvedValue({ id: 5 } as any);
      tamboRepository.findByProveedor.mockResolvedValue([]);

      const result = await service.findByProveedor(5, tenantValido);

      expect(proveedorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5, empresaId: 10 },
      });
      expect(tamboRepository.findByProveedor).toHaveBeenCalledWith(5, 10);
      expect(result).toEqual([]);
    });

    it('debe arrojar NotFoundException si el proveedor no pertenece a la empresa', async () => {
      proveedorRepository.findOne.mockResolvedValue(null);

      await expect(service.findByProveedor(5, tenantValido)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('debe devolver un tambo si se encuentra', async () => {
      const tambo = { id: 1, nombre: 'Tambo A', empresaId: 10, activo: true };
      tamboRepository.findById.mockResolvedValue(tambo);

      const result = await service.findOne(1, tenantValido);

      expect(tamboRepository.findById).toHaveBeenCalledWith(1, 10);
      expect(result.id).toBe(1);
    });

    it('debe arrojar NotFoundException si no existe', async () => {
      tamboRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(1, tenantValido)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto: UpdateTamboDto = { nombre: 'Nombre Editado' };

    it('debe actualizar los campos enviados', async () => {
      const tambo = {
        id: 1,
        nombre: 'Viejo Nombre',
        ubicacion: 'Ruta 1',
        empresaId: 10,
      };
      tamboRepository.findById.mockResolvedValue(tambo);
      tamboRepository.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.update(1, dto, tenantValido);

      expect(result.nombre).toBe('Nombre Editado');
      expect(tamboRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Nombre Editado' }),
      );
    });

    it('debe arrojar NotFoundException si el tambo no existe', async () => {
      tamboRepository.findById.mockResolvedValue(null);

      await expect(service.update(1, dto, tenantValido)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('debe desactivar el tambo si está activo', async () => {
      const tambo = { id: 1, nombre: 'Tambo A', activo: true };
      tamboRepository.findById.mockResolvedValue(tambo);
      tamboRepository.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.remove(1, tenantValido);

      expect(result.activo).toBe(false);
      expect(tamboRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false }),
      );
    });

    it('debe arrojar BadRequestException si ya está desactivado', async () => {
      const tambo = { id: 1, nombre: 'Tambo A', activo: false };
      tamboRepository.findById.mockResolvedValue(tambo);

      await expect(service.remove(1, tenantValido)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe arrojar NotFoundException si el tambo no existe', async () => {
      tamboRepository.findById.mockResolvedValue(null);

      await expect(service.remove(1, tenantValido)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activar', () => {
    it('debe reactivar el tambo si está inactivo y su proveedor activo', async () => {
      const tambo = { id: 1, nombre: 'Tambo A', proveedorId: 5, activo: false };
      const proveedor = { id: 5, estado: EstadoProveedor.ACTIVA };

      tamboRepository.findById.mockResolvedValue(tambo);
      proveedorRepository.findOne.mockResolvedValue(proveedor as any);
      tamboRepository.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.activar(1, tenantValido);

      expect(result.activo).toBe(true);
      expect(tamboRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true }),
      );
    });

    it('debe arrojar BadRequestException si el tambo ya está activo', async () => {
      const tambo = { id: 1, nombre: 'Tambo A', activo: true };
      tamboRepository.findById.mockResolvedValue(tambo);

      await expect(service.activar(1, tenantValido)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe arrojar BadRequestException si el proveedor asociado no está activo', async () => {
      const tambo = { id: 1, nombre: 'Tambo A', proveedorId: 5, activo: false };
      const proveedorInactivo = { id: 5, estado: 'INACTIVA' };

      tamboRepository.findById.mockResolvedValue(tambo);
      proveedorRepository.findOne.mockResolvedValue(proveedorInactivo as any);

      await expect(service.activar(1, tenantValido)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe arrojar NotFoundException si el tambo a activar no existe', async () => {
      tamboRepository.findById.mockResolvedValue(null);

      await expect(service.activar(1, tenantValido)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
