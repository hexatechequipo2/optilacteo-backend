import { MetricaParametroResponseDto } from '../dto/metrica-parametro-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('MetricaParametroResponseDto', () => {
  it('debe instanciarse correctamente con todos sus campos poblados', () => {
    const fechaLectura = new Date('2026-07-31T10:00:00Z');

    const dto = new MetricaParametroResponseDto();
    dto.parametro = Parametro.TEMPERATURA;
    dto.valor = 18.5;
    dto.unidad = '°C';
    dto.umbralMin = 2.0;
    dto.umbralMax = 8.0;
    dto.fueraDeRango = true;
    dto.timestampLectura = fechaLectura;

    expect(dto).toBeDefined();
    expect(dto.parametro).toBe(Parametro.TEMPERATURA);
    expect(dto.valor).toBe(18.5);
    expect(dto.unidad).toBe('°C');
    expect(dto.umbralMin).toBe(2.0);
    expect(dto.umbralMax).toBe(8.0);
    expect(dto.fueraDeRango).toBe(true);
    expect(dto.timestampLectura).toBe(fechaLectura);
  });

  it('debe permitir instanciarse con umbrales nulos (sin límites configurados)', () => {
    const dto = new MetricaParametroResponseDto();
    dto.parametro = Parametro.TEMPERATURA;
    dto.valor = 45;
    dto.unidad = '%';
    dto.umbralMin = null;
    dto.umbralMax = null;
    dto.fueraDeRango = false;
    dto.timestampLectura = new Date();

    expect(dto).toBeDefined();
    expect(dto.umbralMin).toBeNull();
    expect(dto.umbralMax).toBeNull();
    expect(dto.fueraDeRango).toBe(false);
  });
});
