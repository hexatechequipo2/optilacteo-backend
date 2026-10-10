import { MedicionManualMapper } from '../mappers/medicion-manual.mapper';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SemaforoService } from '../../config-parametro/semaforo.service';

describe('MedicionManualMapper', () => {
  const semaforoService = {
    calcularEstado: jest.fn(),
  } as unknown as SemaforoService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toEntities', () => {
    it('debe construir una entidad parcial por cada parámetro', () => {
      const dto = {
        tipoMateriaPrima: 'LECHE',
        parametros: [
          { parametro: 'temperatura', valor: 4 },
          { parametro: 'ph', valor: 6.5 },
        ],
      } as unknown as CreateMedicionManualLoteDto;

      const resultado = MedicionManualMapper.toEntities(dto, 10, 20, 30);

      expect(resultado).toEqual([
        {
          loteId: 10,
          empresaId: 20,
          usuarioId: 30,
          tipoMateriaPrima: dto.tipoMateriaPrima,
          parametro: 'temperatura',
          valor: 4,
        },
        {
          loteId: 10,
          empresaId: 20,
          usuarioId: 30,
          tipoMateriaPrima: dto.tipoMateriaPrima,
          parametro: 'ph',
          valor: 6.5,
        },
      ]);
    });

    it('debe devolver un array vacío si no hay parámetros', () => {
      const dto = {
        tipoMateriaPrima: 'LECHE',
        parametros: [],
      } as unknown as CreateMedicionManualLoteDto;

      expect(MedicionManualMapper.toEntities(dto, 1, 2, 3)).toEqual([]);
    });
  });

  describe('toResponseItem', () => {
    it('debe convertir la entidad y calcular el estado', () => {
      const fecha = new Date('2026-08-01T10:00:00.000Z');
      const estado = 'NORMAL';

      const entity = {
        id: 15,
        parametro: 'temperatura',
        valor: '4.5',
        createdAt: fecha,
      } as unknown as MedicionManualLote;

      const config = {
        parametro: 'temperatura',
      } as ConfiguracionParametro;

      (semaforoService.calcularEstado as jest.Mock).mockReturnValue(estado);

      const resultado = MedicionManualMapper.toResponseItem(
        entity,
        config,
        semaforoService,
      );

      expect(resultado.id).toBe(15);
      expect(resultado.parametro).toBe('temperatura');
      expect(resultado.valor).toBe(4.5);
      expect(resultado.estado).toBe(estado);
      expect(resultado.createdAt).toBe(fecha);
      expect(semaforoService.calcularEstado).toHaveBeenCalledWith(4.5, config);
    });

    it('debe aceptar una configuración de umbral indefinida', () => {
      const entity = {
        id: 16,
        parametro: 'ph',
        valor: '6.2',
        createdAt: new Date('2026-08-02T10:00:00.000Z'),
      } as unknown as MedicionManualLote;

      const estado = 'SIN_UMBRAL_CONFIGURADO';

      (semaforoService.calcularEstado as jest.Mock).mockReturnValue(estado);

      const resultado = MedicionManualMapper.toResponseItem(
        entity,
        undefined,
        semaforoService,
      );

      expect(resultado.valor).toBe(6.2);
      expect(resultado.estado).toBe(estado);
      expect(semaforoService.calcularEstado).toHaveBeenCalledWith(
        6.2,
        undefined,
      );
    });

    it('debe convertir un valor numérico almacenado como string', () => {
      const entity = {
        id: 17,
        parametro: 'humedad',
        valor: '12',
        createdAt: new Date(),
      } as unknown as MedicionManualLote;

      (semaforoService.calcularEstado as jest.Mock).mockReturnValue('EN_LIMITE');

      const resultado = MedicionManualMapper.toResponseItem(
        entity,
        undefined,
        semaforoService,
      );

      expect(resultado.valor).toBe(12);
      expect(resultado.estado).toBe('EN_LIMITE');
    });
  });

  describe('toResponseItemList', () => {
    it('debe usar la configuración correspondiente a cada parámetro y materia prima', () => {
      const fecha1 = new Date('2026-08-01T10:00:00.000Z');
      const fecha2 = new Date('2026-08-01T11:00:00.000Z');

      const entities = [
        {
          id: 1,
          parametro: 'temperatura',
          valor: '4',
          tipoMateriaPrima: 'LECHE',
          createdAt: fecha1,
        },
        {
          id: 2,
          parametro: 'ph',
          valor: '6.5',
          tipoMateriaPrima: 'LECHE',
          createdAt: fecha2,
        },
      ] as unknown as MedicionManualLote[];

      const configTemperatura = {
        parametro: 'temperatura',
      } as ConfiguracionParametro;

      const configPh = {
        parametro: 'ph',
      } as ConfiguracionParametro;

      const mapaConfig = new Map<string, ConfiguracionParametro>([
        ['temperatura|LECHE', configTemperatura],
        ['ph|LECHE', configPh],
      ]);

      (semaforoService.calcularEstado as jest.Mock)
        .mockReturnValueOnce('NORMAL')
        .mockReturnValueOnce('FUERA_DE_RANGO');

      const resultado = MedicionManualMapper.toResponseItemList(
        entities,
        mapaConfig,
        semaforoService,
      );

      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toMatchObject({
        id: 1,
        parametro: 'temperatura',
        valor: 4,
        estado: 'NORMAL',
        createdAt: fecha1,
      });
      expect(resultado[1]).toMatchObject({
        id: 2,
        parametro: 'ph',
        valor: 6.5,
        estado: 'FUERA_DE_RANGO',
        createdAt: fecha2,
      });

      expect(semaforoService.calcularEstado).toHaveBeenNthCalledWith(
        1,
        4,
        configTemperatura,
      );
      expect(semaforoService.calcularEstado).toHaveBeenNthCalledWith(
        2,
        6.5,
        configPh,
      );
    });

    it('debe devolver un array vacío si no hay mediciones', () => {
      const resultado = MedicionManualMapper.toResponseItemList(
        [],
        new Map<string, ConfiguracionParametro>(),
        semaforoService,
      );

      expect(resultado).toEqual([]);
      expect(semaforoService.calcularEstado).not.toHaveBeenCalled();
    });

    it('debe pasar undefined si no existe configuración para el parámetro', () => {
      const entities = [
        {
          id: 3,
          parametro: 'densidad',
          valor: '1.2',
          tipoMateriaPrima: 'LECHE',
          createdAt: new Date(),
        },
      ] as unknown as MedicionManualLote[];

      (semaforoService.calcularEstado as jest.Mock).mockReturnValue(
        'SIN_UMBRAL_CONFIGURADO',
      );

      const resultado = MedicionManualMapper.toResponseItemList(
        entities,
        new Map<string, ConfiguracionParametro>(),
        semaforoService,
      );

      expect(resultado[0].estado).toBe('SIN_UMBRAL_CONFIGURADO');
      expect(semaforoService.calcularEstado).toHaveBeenCalledWith(
        1.2,
        undefined,
      );
    });
  });
});
