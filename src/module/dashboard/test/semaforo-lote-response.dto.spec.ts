import {
  SemaforoLoteResponseDto,
  SemaforoParametroDto,
} from '../dto/semaforo-lote-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';

describe('SemaforoLoteResponseDto', () => {
  it('SemaforoParametroDto permite armar un parámetro del semáforo', () => {
    const dto = new SemaforoParametroDto();
    dto.parametro = Parametro.PH;
    dto.valor = 6.7;
    dto.estado = Object.values(EstadoMedicion)[0] as EstadoMedicion;
    dto.origen = 'SENSOR';
    dto.timestamp = new Date('2026-08-01T10:00:00Z');

    expect(dto).toBeInstanceOf(SemaforoParametroDto);
    expect(dto.origen).toBe('SENSOR');
  });

  it('SemaforoLoteResponseDto agrupa los parámetros del lote', () => {
    const dto = new SemaforoLoteResponseDto();
    dto.loteId = 1;
    dto.loteCodigo = 'LOT-1';
    dto.parametros = [new SemaforoParametroDto()];

    expect(dto).toBeInstanceOf(SemaforoLoteResponseDto);
    expect(dto.parametros).toHaveLength(1);
  });
});