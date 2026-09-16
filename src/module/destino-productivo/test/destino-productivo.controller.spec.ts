import { Test, TestingModule } from '@nestjs/testing';
import { DestinoProductivoController } from '../destino-productivo.controller';
import { DestinoProductivoService } from '../destino-productivo.service';
import { CreateDestinoProductivoDto } from '../dto/create-destino-productivo.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';

describe('DestinoProductivoController — gestión de destinos productivos (HU-49)', () => {
  let controller: DestinoProductivoController;
  let service: DestinoProductivoService;

  const mockDestinoProductivoService = {
    findActivos: jest.fn(),
    create: jest.fn(),
  };

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: ROLES.RESPONSABLE_PRODUCCION as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DestinoProductivoController],
      providers: [
        {
          provide: DestinoProductivoService,
          useValue: mockDestinoProductivoService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DestinoProductivoController>(DestinoProductivoController);
    service = module.get<DestinoProductivoService>(DestinoProductivoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findActivos', () => {
    it('debe delegar la consulta al servicio y retornar la lista de destinos productivos activos', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Queso Cremoso' },
        { id: 2, nombre: 'Yogurt Entero' },
      ];
      mockDestinoProductivoService.findActivos.mockResolvedValue(mockDestinos);

      const resultado = await controller.findActivos(mockTenant);

      expect(service.findActivos).toHaveBeenCalledWith(mockTenant);
      expect(resultado).toEqual(mockDestinos);
    });
  });

  describe('create', () => {
    it('debe delegar la creación al servicio pasando el tenant y el DTO, y retornar el destino creado', async () => {
      const mockDto: CreateDestinoProductivoDto = { nombre: 'Dulce de Leche' };
      const mockDestinoCreado = { id: 10, nombre: 'Dulce de Leche' };

      mockDestinoProductivoService.create.mockResolvedValue(mockDestinoCreado);

      const resultado = await controller.create(mockTenant, mockDto);

      expect(service.create).toHaveBeenCalledWith(mockTenant, mockDto);
      expect(resultado).toEqual(mockDestinoCreado);
    });
  });
});