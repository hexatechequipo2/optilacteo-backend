import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PlcConfigService } from '../plc-config.service';
import { PLC_CONFIG_REPOSITORY } from '../repository/plc-config-repository.interface';
import { PlcConfig } from '../entities/plc-config.entity';
import { TenantContext } from '../../../common/types/tenant-context.type';

describe('PlcConfigService', () => {
  let service: PlcConfigService;
  let repository: any;

  const mockRepo = {
    findByEmpresa: jest.fn(),
    existsSensorDigitalOAnalogico: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlcConfigService,
        {
          provide: PLC_CONFIG_REPOSITORY,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PlcConfigService>(PlcConfigService);
    repository = module.get(PLC_CONFIG_REPOSITORY);

    global.fetch = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveEmpresaId', () => {
    it('debe arrojar BadRequestException si empresaId es nulo o indefinido', async () => {
      const invalidTenant = { empresaId: undefined } as unknown as TenantContext;

      await expect(service.obtenerConfig(invalidTenant)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenerConfig', () => {
    it('debe retornar la respuesta mapeada correctamente', async () => {
      const tenant = { empresaId: 10 } as TenantContext;
      const configMock = { id: 1, empresaId: 10, url: 'http://192.168.1.50' } as PlcConfig;

      repository.findByEmpresa.mockResolvedValue(configMock);
      repository.existsSensorDigitalOAnalogico.mockResolvedValue(true);

      const result = await service.obtenerConfig(tenant);

      expect(repository.findByEmpresa).toHaveBeenCalledWith(10);
      expect(repository.existsSensorDigitalOAnalogico).toHaveBeenCalledWith(10);
      expect(result).toEqual({ url: 'http://192.168.1.50', requierePlc: true });
    });
  });

  describe('guardarUrl', () => {
    const tenant = { empresaId: 10 } as TenantContext;
    const dto = { url: 'http://192.168.1.100' };

    it('debe actualizar una configuración existente', async () => {
      const existente = { id: 1, empresaId: 10, url: 'http://192.168.1.50' } as PlcConfig;
      
      repository.findByEmpresa.mockResolvedValue(existente);
      repository.save.mockResolvedValue({ ...existente, url: dto.url });
      repository.existsSensorDigitalOAnalogico.mockResolvedValue(false);

      const result = await service.guardarUrl(dto, tenant);

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ url: dto.url }));
      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toEqual({ url: dto.url, requierePlc: false });
    });

    it('debe crear una nueva configuración si no existe previa', async () => {
      repository.findByEmpresa.mockResolvedValue(null);
      repository.create.mockImplementation((entity) => Promise.resolve(entity));
      repository.existsSensorDigitalOAnalogico.mockResolvedValue(true);

      const result = await service.guardarUrl(dto, tenant);

      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual({ url: dto.url, requierePlc: true });
    });
  });

  describe('testConexion', () => {
    const dto = { url: 'http://192.168.1.50/api' };

    it('debe retornar ok true cuando fetch responde con status 200', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await service.testConexion(dto);

      expect(result).toEqual({
        ok: true,
        mensaje: 'Conexión exitosa. El PLC respondió correctamente.',
      });
    });

    it('debe retornar ok false cuando fetch responde con error HTTP (ej. 404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

      const result = await service.testConexion(dto);

      expect(result).toEqual({
        ok: false,
        mensaje: 'El PLC respondió con estado 404.',
      });
    });

    it('debe capturar Timeout / AbortError y notificar falta de respuesta', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const result = await service.testConexion(dto);

      expect(result).toEqual({
        ok: false,
        mensaje: 'El PLC no respondió dentro del tiempo esperado.',
      });
    });

    it('debe capturar errores generales de red', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.testConexion(dto);

      expect(result).toEqual({
        ok: false,
        mensaje: 'No se pudo establecer conexión con el PLC.',
      });
    });
  });
});