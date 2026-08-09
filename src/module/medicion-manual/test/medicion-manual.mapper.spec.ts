import { MedicionManualMapper } from '../mappers/medicion-manual.mapper';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('MedicionManualMapper', () => {
  describe('toEntities', () => {
    it('debe mapear correctamente un DTO con sus parámetros a un array de entidades parciales', () => {
      const dto: CreateMedicionManualLoteDto = {
        tipoMateriaPrima: 'LECHE',
        parametros: [
          { parametro: 'TEMP', valor: 4.5 },
          { parametro: 'PH', valor: 6.7 },
        ],
      } as any;

      const loteId = 10;
      const empresaId = 1;
      const usuarioId = 5;

      const result = MedicionManualMapper.toEntities(
        dto,
        loteId,
        empresaId,
        usuarioId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        loteId: 10,
        empresaId: 1,
        usuarioId: 5,
        tipoMateriaPrima: 'LECHE',
        parametro: 'TEMP',
        valor: 4.5,
      });
      expect(result[1]).toEqual({
        loteId: 10,
        empresaId: 1,
        usuarioId: 5,
        tipoMateriaPrima: 'LECHE',
        parametro: 'PH',
        valor: 6.7,
      });
    });
  });

  describe('toResponseItem', () => {
    const mockEntity: MedicionManualLote = {
      id: 100,
      parametro: 'TEMP',
      valor: '5.5' as any, // Simula valor almacenado como string/decimal en BD
      createdAt: new Date('2026-07-31T10:00:00Z'),
      tipoMateriaPrima: 'LECHE',
    } as unknown as MedicionManualLote;

    it('debe devolver estado SIN_UMBRAL_CONFIGURADO si no existe configuración', () => {
      const result = MedicionManualMapper.toResponseItem(mockEntity, undefined);

      expect(result.id).toBe(100);
      expect(result.parametro).toBe('TEMP');
      expect(result.valor).toBe(5.5); // Verifica conversión a Number
      expect(result.estado).toBe(EstadoMedicion.SIN_UMBRAL_CONFIGURADO);
      expect(result.createdAt).toEqual(mockEntity.createdAt);
    });

    it('debe devolver estado NORMAL si el valor está dentro de los umbrales', () => {
      const config: ConfiguracionParametro = {
        umbralMin: 2.0,
        umbralMax: 8.0,
      } as ConfiguracionParametro;

      const result = MedicionManualMapper.toResponseItem(mockEntity, config);

      expect(result.estado).toBe(EstadoMedicion.NORMAL);
    });

    it('debe devolver estado NORMAL en los valores límite (inclusivo)', () => {
      const config: ConfiguracionParametro = {
        umbralMin: 5.5,
        umbralMax: 5.5,
      } as ConfiguracionParametro;

      const result = MedicionManualMapper.toResponseItem(mockEntity, config);

      expect(result.estado).toBe(EstadoMedicion.NORMAL);
    });

    it('debe devolver estado FUERA_DE_RANGO si el valor es menor al umbral mínimo', () => {
      const config: ConfiguracionParametro = {
        umbralMin: 6.0,
        umbralMax: 10.0,
      } as ConfiguracionParametro;

      const result = MedicionManualMapper.toResponseItem(mockEntity, config);

      expect(result.estado).toBe(EstadoMedicion.FUERA_DE_RANGO);
    });

    it('debe devolver estado FUERA_DE_RANGO si el valor es mayor al umbral máximo', () => {
      const config: ConfiguracionParametro = {
        umbralMin: 1.0,
        umbralMax: 5.0,
      } as ConfiguracionParametro;

      const result = MedicionManualMapper.toResponseItem(mockEntity, config);

      expect(result.estado).toBe(EstadoMedicion.FUERA_DE_RANGO);
    });
  });

  describe('toResponseItemList', () => {
    it('debe mapear una lista de entidades utilizando el mapa de configuración', () => {
      const entities: MedicionManualLote[] = [
        {
          id: 1,
          parametro: 'TEMP',
          tipoMateriaPrima: 'LECHE',
          valor: 4,
          createdAt: new Date(),
        } as unknown as MedicionManualLote,
        {
          id: 2,
          parametro: 'PH',
          tipoMateriaPrima: 'LECHE',
          valor: 8.5,
          createdAt: new Date(),
        } as unknown as MedicionManualLote,
      ];

      const configTemp: ConfiguracionParametro = {
        umbralMin: 2,
        umbralMax: 6,
      } as ConfiguracionParametro;

      const configMap = new Map<string, ConfiguracionParametro>();
      configMap.set('TEMP|LECHE', configTemp); // 'PH|LECHE' no se agrega para probar SIN_UMBRAL

      const results = MedicionManualMapper.toResponseItemList(
        entities,
        configMap,
      );

      expect(results).toHaveLength(2);

      expect(results[0].id).toBe(1);
      expect(results[0].estado).toBe(EstadoMedicion.NORMAL);

      expect(results[1].id).toBe(2);
      expect(results[1].estado).toBe(EstadoMedicion.SIN_UMBRAL_CONFIGURADO);
    });
  });
});
