import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AsistenteVozService } from '../asistente-voz.service';
import { DictadoParametrosParserService } from '../parser/dictado-parametros-parser.service';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { Lote } from '../../lote/entities/lote.entity';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { ParsearDictadoDto } from '../dto/parsear-dictado.dto';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('AsistenteVozService', () => {
  let service: AsistenteVozService;
  let loteRepoMock: { findById: jest.Mock };
  let configParametroRepoMock: jest.Mocked<Repository<ConfiguracionParametro>>;

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: 'ADMIN' as any,
  };

  const loteBase: Partial<Lote> = {
    id: 10,
    empresaId: 1,
    materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
  };

  function configFactory(
    parametro: Parametro,
    umbralMin: number,
    umbralMax: number,
  ): ConfiguracionParametro {
    return {
      id: 1,
      empresaId: 1,
      parametro,
      tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      umbralMin,
      umbralMax,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ConfiguracionParametro;
  }

  beforeEach(async () => {
    loteRepoMock = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenteVozService,
        DictadoParametrosParserService,
        {
          provide: LOTE_REPOSITORY,
          useValue: loteRepoMock,
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AsistenteVozService>(AsistenteVozService);
    configParametroRepoMock = module.get(
      getRepositoryToken(ConfiguracionParametro),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('parsearDictado', () => {
    const loteId = 10;
    const dto: ParsearDictadoDto = {
      texto: 'grasa 3,6 coma proteína 3,2, acidez 14 temperatura 4',
    };

    it('lanza BadRequestException si tenant.empresaId es nulo', async () => {
      const invalidTenant = { empresaId: null } as any;

      await expect(
        service.parsearDictado(loteId, dto, invalidTenant),
      ).rejects.toThrow(
        new BadRequestException(
          'No se pudo determinar la empresa del usuario autenticado',
        ),
      );
      expect(loteRepoMock.findById).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el lote no existe o no pertenece a la empresa', async () => {
      loteRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.parsearDictado(loteId, dto, mockTenant),
      ).rejects.toThrow(new NotFoundException(`Lote ${loteId} no encontrado`));
      expect(loteRepoMock.findById).toHaveBeenCalledWith(loteId, 1);
    });

    it('consulta ConfiguracionParametro con el tipoMateriaPrima del lote, no uno fijo', async () => {
      loteRepoMock.findById.mockResolvedValue({
        ...loteBase,
        materiaPrima: TipoMateriaPrima.CREMA_DE_LECHE,
      });
      configParametroRepoMock.find.mockResolvedValue([]);

      await service.parsearDictado(loteId, dto, mockTenant);

      expect(configParametroRepoMock.find).toHaveBeenCalledWith({
        where: {
          empresaId: 1,
          tipoMateriaPrima: TipoMateriaPrima.CREMA_DE_LECHE,
        },
      });
    });

    it('devuelve los parámetros reconocidos, sin faltantes cuando llegaron todos los obligatorios', async () => {
      loteRepoMock.findById.mockResolvedValue(loteBase);
      configParametroRepoMock.find.mockResolvedValue([
        configFactory(Parametro.GRASA, 3, 5),
        configFactory(Parametro.PROTEINA, 3, 4),
      ]);

      const resultado = await service.parsearDictado(loteId, dto, mockTenant);

      expect(resultado.parametros.map((p) => p.parametro)).toEqual([
        Parametro.GRASA,
        Parametro.PROTEINA,
        Parametro.ACIDEZ,
        Parametro.TEMPERATURA,
      ]);
      expect(resultado.obligatoriosFaltantes).toEqual([]);
      expect(resultado.noReconocido).toEqual([]);
      expect(resultado.textoOriginal).toBe(dto.texto);
    });

    it('reporta en obligatoriosFaltantes los parámetros configurados que no fueron dictados', async () => {
      loteRepoMock.findById.mockResolvedValue(loteBase);
      // La empresa exige PH además de grasa/proteína/acidez/temperatura,
      // pero el operario no lo dictó.
      configParametroRepoMock.find.mockResolvedValue([
        configFactory(Parametro.GRASA, 3, 5),
        configFactory(Parametro.PROTEINA, 3, 4),
        configFactory(Parametro.PH, 6, 7),
      ]);

      const resultado = await service.parsearDictado(loteId, dto, mockTenant);

      expect(resultado.obligatoriosFaltantes).toEqual([Parametro.PH]);
    });

    it('marca fueraDeUmbralEmpresa cuando el valor dictado queda fuera de umbralMin/umbralMax de la empresa', async () => {
      loteRepoMock.findById.mockResolvedValue(loteBase);
      // Grasa dictada en 3,6 pero la empresa exige entre 4 y 5 para este tipo de materia prima.
      configParametroRepoMock.find.mockResolvedValue([
        configFactory(Parametro.GRASA, 4, 5),
      ]);

      const resultado = await service.parsearDictado(
        loteId,
        { texto: 'grasa 3,6' },
        mockTenant,
      );

      expect(resultado.parametros[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.GRASA,
          valor: 3.6,
          fueraDeRangoFisico: false,
          fueraDeUmbralEmpresa: true,
        }),
      );
    });

    it('devuelve fueraDeUmbralEmpresa null cuando la empresa no tiene umbral configurado para ese parámetro', async () => {
      loteRepoMock.findById.mockResolvedValue(loteBase);
      configParametroRepoMock.find.mockResolvedValue([]); // sin ninguna config

      const resultado = await service.parsearDictado(
        loteId,
        { texto: 'grasa 3,6' },
        mockTenant,
      );

      expect(resultado.parametros[0].fueraDeUmbralEmpresa).toBeNull();
    });

    it('reporta texto no reconocido y parámetros sin valor sin descartarlos', async () => {
      loteRepoMock.findById.mockResolvedValue(loteBase);
      configParametroRepoMock.find.mockResolvedValue([
        configFactory(Parametro.GRASA, 3, 5),
      ]);

      const resultado = await service.parsearDictado(
        loteId,
        { texto: 'grados brix 12, grasa proteina 3,2' },
        mockTenant,
      );

      expect(resultado.noReconocido).toEqual([
        { texto: 'grados brix 12,', motivo: 'texto_no_reconocido' },
        { texto: 'grasa', motivo: 'sin_valor_asociado' },
      ]);
      // grasa sin valor detectable no cuenta como reconocida: sigue faltante.
      expect(resultado.obligatoriosFaltantes).toEqual([Parametro.GRASA]);
      expect(resultado.parametros).toEqual([
        expect.objectContaining({ parametro: Parametro.PROTEINA, valor: 3.2 }),
      ]);
    });
  });
});
