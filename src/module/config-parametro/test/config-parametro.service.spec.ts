import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigParametroService } from '../config-parametro.service';
import { CONFIG_PARAMETRO_REPOSITORY } from '../repository/config-parametro.repository.interface';
import { ConfigParametroMapper } from '../mappers/config-parametro.mapper';

// El mapper se mockea porque solo interesa validar que el Service lo invoque
// correctamente, no su lógica interna de conversión (eso se testea aparte).
jest.mock('../mappers/config-parametro.mapper', () => ({
  ConfigParametroMapper: {
    toEntity: jest.fn(),
    toResponse: jest.fn(),
  },
}));

const mockRepository = {
  findByParametroAndTipoMateriaPrima: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
  findByEmpresa: jest.fn(),
  delete: jest.fn(),
};

describe('ConfigParametroService', () => {
  let service: ConfigParametroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigParametroService,
        { provide: CONFIG_PARAMETRO_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ConfigParametroService>(ConfigParametroService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('cuando ya existe una configuración para el parámetro y tipo de materia prima, debe lanzar ConflictException', async () => {
      mockRepository.findByParametroAndTipoMateriaPrima.mockResolvedValue({ id: 1 });

      await expect(
        service.crear(1, { parametro: 'PH', tipoMateriaPrima: 'LECHE_CRUDA' } as any),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('cuando no existe configuración previa, debe crearla y devolver la respuesta mapeada', async () => {
      mockRepository.findByParametroAndTipoMateriaPrima.mockResolvedValue(null);
      const dto = { parametro: 'PH', tipoMateriaPrima: 'LECHE_CRUDA', umbralMin: 6, umbralMax: 7 } as any;
      const entity = { ...dto, empresaId: 1 };
      const saved = { id: 10, ...entity };
      const response = { id: 10, parametro: 'PH' };
      (ConfigParametroMapper.toEntity as jest.Mock).mockReturnValue(entity);
      mockRepository.save.mockResolvedValue(saved);
      (ConfigParametroMapper.toResponse as jest.Mock).mockReturnValue(response);

      const resultado = await service.crear(1, dto);

      expect(ConfigParametroMapper.toEntity).toHaveBeenCalledWith(dto, 1);
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
      expect(resultado).toEqual(response);
    });
  });

  describe('editar', () => {
    it('cuando la configuración no existe, debe lanzar NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.editar(1, 99, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('cuando la configuración pertenece a otra empresa, debe lanzar ForbiddenException', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, empresaId: 2, umbralMin: 1, umbralMax: 10 });

      await expect(service.editar(1, 1, {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('cuando umbralMin es mayor o igual a umbralMax, debe lanzar ConflictException', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, empresaId: 1, umbralMin: 5, umbralMax: 10 });

      await expect(service.editar(1, 1, { umbralMin: 12 } as any)).rejects.toThrow(ConflictException);
    });

    it('cuando los datos son válidos, debe actualizar los umbrales y devolver la respuesta mapeada', async () => {
      const config = { id: 1, empresaId: 1, umbralMin: 5, umbralMax: 10 };
      mockRepository.findById.mockResolvedValue(config);
      mockRepository.save.mockResolvedValue({ ...config, umbralMin: 6, umbralMax: 12 });
      const response = { id: 1, umbralMin: 6, umbralMax: 12 };
      (ConfigParametroMapper.toResponse as jest.Mock).mockReturnValue(response);

      const resultado = await service.editar(1, 1, { umbralMin: 6, umbralMax: 12 } as any);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ umbralMin: 6, umbralMax: 12 }),
      );
      expect(resultado).toEqual(response);
    });
  });

  describe('listarPorEmpresa', () => {
    it('debe devolver la lista de configuraciones de la empresa, mapeadas', async () => {
      mockRepository.findByEmpresa.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      (ConfigParametroMapper.toResponse as jest.Mock).mockImplementation((c: any) => ({ mapped: c.id }));

      const resultado = await service.listarPorEmpresa(1);

      expect(mockRepository.findByEmpresa).toHaveBeenCalledWith(1);
      expect(resultado).toEqual([{ mapped: 1 }, { mapped: 2 }]);
    });
  });

  describe('eliminar', () => {
    it('cuando la configuración no existe, debe lanzar NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.eliminar(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('cuando la configuración pertenece a otra empresa, debe lanzar ForbiddenException', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, empresaId: 2 });

      await expect(service.eliminar(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('cuando la configuración es válida, debe eliminarla y devolver un mensaje de éxito', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, empresaId: 1 });
      mockRepository.delete.mockResolvedValue(undefined);

      const resultado = await service.eliminar(1, 1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(resultado).toEqual({ message: 'Configuración eliminada exitosamente' });
    });
  });
});