import {
  ParametroComparacionDto,
  ComparacionHistoricaResponseDto,
} from '../dto/comparacion-historica-response.dto';

describe('DTOs de Comparación Histórica', () => {
  describe('ParametroComparacionDto', () => {
    it('debe instanciarse correctamente y asignar todas sus propiedades', () => {
      const dto = new ParametroComparacionDto();
      dto.parametro = 'HUMEDAD';
      dto.valorLote = 12.5;
      dto.promedioHistorico = 10.0;
      dto.desviacionPorcentual = 25.0;
      dto.superaDesvioSignificativo = true;

      expect(dto).toBeDefined();
      expect(dto.parametro).toBe('HUMEDAD');
      expect(dto.valorLote).toBe(12.5);
      expect(dto.promedioHistorico).toBe(10.0);
      expect(dto.desviacionPorcentual).toBe(25.0);
      expect(dto.superaDesvioSignificativo).toBe(true);
    });
  });

  describe('ComparacionHistoricaResponseDto', () => {
    it('debe instanciarse correctamente con una lista de parámetros anidados', () => {
      const mockParametro = new ParametroComparacionDto();
      mockParametro.parametro = 'TEMPERATURA';
      mockParametro.valorLote = 4.0;
      mockParametro.promedioHistorico = 4.2;
      mockParametro.desviacionPorcentual = -4.76;
      mockParametro.superaDesvioSignificativo = false;

      const responseDto = new ComparacionHistoricaResponseDto();
      responseDto.loteId = 100;
      responseDto.cantidadLotesHistoricosUtilizados = 5;
      responseDto.cantidadLotesHistoricosConfigurada = 5;
      responseDto.desvioSignificativoPorcentaje = 10;
      responseDto.parametros = [mockParametro];

      expect(responseDto).toBeDefined();
      expect(responseDto.loteId).toBe(100);
      expect(responseDto.cantidadLotesHistoricosUtilizados).toBe(5);
      expect(responseDto.cantidadLotesHistoricosConfigurada).toBe(5);
      expect(responseDto.desvioSignificativoPorcentaje).toBe(10);
      expect(responseDto.parametros).toHaveLength(1);
      expect(responseDto.parametros[0]).toBe(mockParametro);
    });

    it('debe permitir instanciarse con un array de parámetros vacío', () => {
      const responseDto = new ComparacionHistoricaResponseDto();
      responseDto.loteId = 101;
      responseDto.cantidadLotesHistoricosUtilizados = 0;
      responseDto.cantidadLotesHistoricosConfigurada = 5;
      responseDto.desvioSignificativoPorcentaje = 15;
      responseDto.parametros = [];

      expect(responseDto).toBeDefined();
      expect(responseDto.parametros).toEqual([]);
    });
  });
});
