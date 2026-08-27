import { Test, TestingModule } from '@nestjs/testing';
import { TamboController } from '../tambo.controller';
import { TamboService } from '../tambo.service';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CreateTamboDto } from '../dto/create-tambo.dto';
import { UpdateTamboDto } from '../dto/update-tambo.dto';

describe('TamboController', () => {
  let controller: TamboController;
  let service: jest.Mocked<TamboService>;

  const mockTenant: TenantContext = { empresaId: 10 } as TenantContext;

  const mockTamboResponse = {
    id: 1,
    nombre: 'Tambo San José',
    ubicacion: 'Ruta 9 Km 50',
    proveedorId: 5,
    empresaId: 10,
    activo: true,
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByProveedor: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      activar: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TamboController],
      providers: [
        {
          provide: TamboService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TamboController>(TamboController);
    service = module.get(TamboService);
  });

  afterEach(() => jest.clearAllMocks());

  it('create: debe delegar la creación al servicio', async () => {
    const dto: CreateTamboDto = {
      nombre: 'Tambo San José',
      proveedorId: 5,
      ubicacion: 'Ruta 9 Km 50',
    };
    service.create.mockResolvedValue(mockTamboResponse as any);

    const result = await controller.create(dto, mockTenant);

    expect(service.create).toHaveBeenCalledWith(dto, mockTenant);
    expect(result).toEqual(mockTamboResponse);
  });

  describe('findAll', () => {
    it('debe llamar a findByProveedor si se provee el query param proveedorId', async () => {
      service.findByProveedor.mockResolvedValue([mockTamboResponse] as any);

      const result = await controller.findAll(mockTenant, '5');

      expect(service.findByProveedor).toHaveBeenCalledWith(5, mockTenant);
      expect(result).toEqual([mockTamboResponse]);
    });

    it('debe llamar a findAll si no se provee el query param proveedorId', async () => {
      service.findAll.mockResolvedValue([mockTamboResponse] as any);

      const result = await controller.findAll(mockTenant, undefined);

      expect(service.findAll).toHaveBeenCalledWith(mockTenant);
      expect(result).toEqual([mockTamboResponse]);
    });
  });

  it('findOne: debe obtener un tambo por su ID parseado a entero', async () => {
    service.findOne.mockResolvedValue(mockTamboResponse as any);

    const result = await controller.findOne('1', mockTenant);

    expect(service.findOne).toHaveBeenCalledWith(1, mockTenant);
    expect(result).toEqual(mockTamboResponse);
  });

  it('update: debe actualizar el tambo correspondiente', async () => {
    const dto: UpdateTamboDto = { nombre: 'Nuevo Tambo' };
    service.update.mockResolvedValue({ ...mockTamboResponse, ...dto } as any);

    const result = await controller.update('1', dto, mockTenant);

    expect(service.update).toHaveBeenCalledWith(1, dto, mockTenant);
    expect(result).toEqual({ ...mockTamboResponse, ...dto });
  });

  it('activar: debe reactivar un tambo', async () => {
    service.activar.mockResolvedValue(mockTamboResponse as any);

    const result = await controller.activar('1', mockTenant);

    expect(service.activar).toHaveBeenCalledWith(1, mockTenant);
    expect(result).toEqual(mockTamboResponse);
  });

  it('remove: debe dar de baja (soft delete) un tambo', async () => {
    const responseInactivo = { ...mockTamboResponse, activo: false };
    service.remove.mockResolvedValue(responseInactivo as any);

    const result = await controller.remove('1', mockTenant);

    expect(service.remove).toHaveBeenCalledWith(1, mockTenant);
    expect(result).toEqual(responseInactivo);
  });
});