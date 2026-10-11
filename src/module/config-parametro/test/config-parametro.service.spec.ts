import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigParametroService } from '../config-parametro.service';
import { CONFIG_PARAMETRO_REPOSITORY } from '../repository/config-parametro.repository.interface';
import { ConfigParametroMapper } from '../mappers/config-parametro.mapper';
import { AuditLogService } from '../../audit/audit-log.service';
import { ROLES } from '../../rol/constants/roles.constants';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import type { TenantContext } from '../../../common/types/tenant-context.type';

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

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

const mockAuditLogService = {
  getTrazabilidadBatch: jest.fn(),
};

// Para los casos que verifican el contrato de punta a punta (lo que se
// persiste y lo que se devuelve) se usa el mapper real, una sola vez.
const { ConfigParametroMapper: MapperReal } = jest.requireActual<{
  ConfigParametroMapper: typeof ConfigParametroMapper;
}>('../mappers/config-parametro.mapper');

// pH (rango físico 0–14). Los decimales llegan de Postgres como string.
const configGuardada = () => ({
  id: 1,
  empresaId: 1,
  parametro: Parametro.PH,
  tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
  umbralAlertaMin: '5.00',
  umbralMin: '6.00',
  umbralMax: '7.00',
  umbralAlertaMax: '8.00',
});

const mensajesDeError = async (promesa: Promise<unknown>) => {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BadRequestException);
  return (error as BadRequestException).getResponse() as {
    message: string[];
  };
};

describe('ConfigParametroService', () => {
  let service: ConfigParametroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigParametroService,
        { provide: CONFIG_PARAMETRO_REPOSITORY, useValue: mockRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ConfigParametroService>(ConfigParametroService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('cuando ya existe una configuración para el parámetro y tipo de materia prima, debe lanzar ConflictException', async () => {
      mockRepository.findByParametroAndTipoMateriaPrima.mockResolvedValue({
        id: 1,
      });

      await expect(
        service.crear(1, {
          parametro: 'PH',
          tipoMateriaPrima: 'LECHE_CRUDA',
        } as any),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('cuando no existe configuración previa, debe crearla y devolver la respuesta mapeada', async () => {
      mockRepository.findByParametroAndTipoMateriaPrima.mockResolvedValue(null);
      const dto = {
        parametro: 'PH',
        tipoMateriaPrima: 'LECHE_CRUDA',
        umbralMin: 6,
        umbralMax: 7,
      } as any;
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

    it('con los 4 umbrales, debe persistir las bandas de alerta y devolverlas en la respuesta', async () => {
      mockRepository.findByParametroAndTipoMateriaPrima.mockResolvedValue(null);
      (ConfigParametroMapper.toEntity as jest.Mock).mockImplementationOnce(
        MapperReal.toEntity,
      );
      (ConfigParametroMapper.toResponse as jest.Mock).mockImplementationOnce(
        MapperReal.toResponse,
      );
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 10 }),
      );

      const resultado = await service.crear(1, {
        parametro: Parametro.PH,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        umbralAlertaMin: 6.2,
        umbralMin: 6.5,
        umbralMax: 6.8,
        umbralAlertaMax: 7,
      });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          umbralAlertaMin: 6.2,
          umbralMin: 6.5,
          umbralMax: 6.8,
          umbralAlertaMax: 7,
        }),
      );
      expect(resultado).toMatchObject({
        id: 10,
        umbralAlertaMin: 6.2,
        umbralMin: 6.5,
        umbralMax: 6.8,
        umbralAlertaMax: 7,
      });
    });
  });

  describe('editar', () => {
    it('cuando la configuración no existe, debe lanzar NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.editar(1, 99, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cuando la configuración pertenece a otra empresa, debe lanzar NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 1,
        empresaId: 2,
        umbralMin: 1,
        umbralMax: 10,
      });

      await expect(service.editar(1, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cuando umbralMin es mayor o igual a umbralMax, debe lanzar BadRequestException sin guardar', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());

      const { message } = await mensajesDeError(
        service.editar(1, 1, { umbralMin: 7 }),
      );

      expect(message).toEqual(['umbralMax debe ser mayor a umbralMin']);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('con un PUT parcial de min/max dentro de la banda guardada, debe actualizarlos y conservar las bandas', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());
      mockRepository.save.mockImplementation((c) => Promise.resolve(c));
      const response = { id: 1 };
      (ConfigParametroMapper.toResponse as jest.Mock).mockReturnValue(response);

      const resultado = await service.editar(1, 1, {
        umbralMin: 5.5,
        umbralMax: 7.5,
      });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          umbralAlertaMin: 5,
          umbralMin: 5.5,
          umbralMax: 7.5,
          umbralAlertaMax: 8,
        }),
      );
      expect(resultado).toEqual(response);
    });

    it('con un PUT parcial de min/max que sale de la banda guardada, debe lanzar BadRequestException', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());

      const { message } = await mensajesDeError(
        service.editar(1, 1, { umbralMin: 4 }),
      );

      expect(message).toEqual([
        'umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax',
      ]);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('con un PUT parcial solo de bandas, debe actualizarlas y conservar min/max', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());
      mockRepository.save.mockImplementation((c) => Promise.resolve(c));

      await service.editar(1, 1, { umbralAlertaMin: 4, umbralAlertaMax: 9 });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          umbralAlertaMin: 4,
          umbralMin: 6,
          umbralMax: 7,
          umbralAlertaMax: 9,
        }),
      );
    });

    it('con un PUT parcial de bandas que invade el rango normal guardado, debe lanzar BadRequestException', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());

      const { message } = await mensajesDeError(
        service.editar(1, 1, { umbralAlertaMax: 6.5 }),
      );

      expect(message).toEqual([
        'umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax',
      ]);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('cuando un valor sale del rango físico del parámetro guardado, debe lanzar BadRequestException', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());

      const { message } = await mensajesDeError(
        service.editar(1, 1, { umbralAlertaMax: 15 }),
      );

      expect(message).toEqual([
        `El valor para ${Parametro.PH} debe estar entre 0 y 14`,
      ]);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('cuando la cadena completa es válida, debe guardar los 4 umbrales y devolver la respuesta mapeada', async () => {
      mockRepository.findById.mockResolvedValue(configGuardada());
      mockRepository.save.mockImplementation((c) => Promise.resolve(c));
      const response = { id: 1 };
      (ConfigParametroMapper.toResponse as jest.Mock).mockReturnValue(response);

      const resultado = await service.editar(1, 1, {
        umbralAlertaMin: 6,
        umbralMin: 6,
        umbralMax: 7,
        umbralAlertaMax: 7,
      });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          umbralAlertaMin: 6,
          umbralMin: 6,
          umbralMax: 7,
          umbralAlertaMax: 7,
        }),
      );
      expect(resultado).toEqual(response);
    });
  });

  describe('listarPorEmpresa', () => {
    it('para un rol distinto de GERENTE, debe devolver la lista mapeada sin consultar auditoria', async () => {
      const tenant: TenantContext = {
        empresaId: 1,
        rolNombre: ROLES.OPERARIO_LINEA,
      };
      mockRepository.findByEmpresa.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      (ConfigParametroMapper.toResponse as jest.Mock).mockImplementation(
        (c: { id: number }) => ({ id: c.id }),
      );

      const resultado = await service.listarPorEmpresa(1, tenant);

      expect(mockRepository.findByEmpresa).toHaveBeenCalledWith(1);
      expect(mockAuditLogService.getTrazabilidadBatch).not.toHaveBeenCalled();
      expect(resultado).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('para el rol GERENTE, debe enriquecer cada item con su trazabilidad', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      mockRepository.findByEmpresa.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      (ConfigParametroMapper.toResponse as jest.Mock).mockImplementation(
        (c: { id: number }) => ({ id: c.id }),
      );
      const trazabilidadMap = new Map([
        [
          1,
          {
            creadoPor: {
              userId: 7,
              userEmail: 'user@lacteo.com',
              fecha: new Date(),
            },
          },
        ],
      ]);
      mockAuditLogService.getTrazabilidadBatch.mockResolvedValue(
        trazabilidadMap,
      );

      const resultado = await service.listarPorEmpresa(1, tenant);

      expect(mockAuditLogService.getTrazabilidadBatch).toHaveBeenCalledWith(
        'ConfiguracionParametro',
        [1, 2],
        1,
      );
      expect(resultado).toEqual([
        { id: 1, auditoria: trazabilidadMap.get(1) },
        { id: 2, auditoria: undefined },
      ]);
    });
  });

  describe('listarPorEmpresa (contrato)', () => {
    it('debe devolver las bandas de alerta de cada configuración como number', async () => {
      mockRepository.findByEmpresa.mockResolvedValue([configGuardada()]);
      (ConfigParametroMapper.toResponse as jest.Mock).mockImplementationOnce(
        MapperReal.toResponse,
      );

      const resultado = await service.listarPorEmpresa(1, {
        empresaId: 1,
        rolNombre: ROLES.OPERARIO_LINEA,
      });

      expect(resultado[0]).toMatchObject({
        umbralAlertaMin: 5,
        umbralMin: 6,
        umbralMax: 7,
        umbralAlertaMax: 8,
      });
    });
  });

  describe('eliminar', () => {
    it('cuando la configuración no existe, debe lanzar NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.eliminar(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('cuando la configuración pertenece a otra empresa, debe lanzar NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, empresaId: 2 });

      await expect(service.eliminar(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('cuando la configuración es válida, debe eliminarla y devolver un mensaje de éxito', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1, empresaId: 1 });
      mockRepository.delete.mockResolvedValue(undefined);

      const resultado = await service.eliminar(1, 1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(resultado).toEqual({
        message: 'Configuración eliminada exitosamente',
      });
    });
  });
});
