import { Test, TestingModule } from '@nestjs/testing';
import { PlcConfigController } from '../plc-config.controller';
import { PlcConfigService } from '../plc-config.service';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

describe('PlcConfigController', () => {
  let controller: PlcConfigController;
  let service: jest.Mocked<PlcConfigService>;

  const mockTenant: TenantContext = { empresaId: 10 } as TenantContext;

  beforeEach(async () => {
    const mockService = {
      obtenerConfig: jest.fn(),
      guardarUrl: jest.fn(),
      testConexion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlcConfigController],
      providers: [
        {
          provide: PlcConfigService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlcConfigController>(PlcConfigController);
    service = module.get(PlcConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  it('obtenerConfig: debe llamar al servicio con el tenant', async () => {
    const mockResponse = { url: 'http://192.168.1.50', requierePlc: true };
    service.obtenerConfig.mockResolvedValue(mockResponse);

    const result = await controller.obtenerConfig(mockTenant);

    expect(service.obtenerConfig).toHaveBeenCalledWith(mockTenant);
    expect(result).toEqual(mockResponse);
  });

  it('guardarUrl: debe delegar la actualización al servicio', async () => {
    const dto = { url: 'http://192.168.1.50' };
    const mockResponse = { url: dto.url, requierePlc: true };
    service.guardarUrl.mockResolvedValue(mockResponse);

    const result = await controller.guardarUrl(mockTenant, dto);

    expect(service.guardarUrl).toHaveBeenCalledWith(dto, mockTenant);
    expect(result).toEqual(mockResponse);
  });

  it('testConexion: debe verificar el estado de la conexión', async () => {
    const dto = { url: 'http://192.168.1.50' };
    const mockResponse = { ok: true, mensaje: 'Conexión exitosa. El PLC respondió correctamente.' };
    service.testConexion.mockResolvedValue(mockResponse);

    const result = await controller.testConexion(dto);

    expect(service.testConexion).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockResponse);
  });
});