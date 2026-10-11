import {
  MedicionManualItemResponseDto,
  MedicionManualLoteResponseDto,
  HistorialMedicionManualResponseDto,
} from '../dto/medicion-manual-lote-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';

describe('MedicionManualItemResponseDto', () => {
  it('debería crear una medición manual con sus propiedades', () => {
    const dto = new MedicionManualItemResponseDto();

    dto.id = 1;
    dto.parametro = Object.values(Parametro)[0] as Parametro;
    dto.valor = 5;
    dto.estado = Object.values(EstadoMedicion)[0] as EstadoMedicion;
    dto.createdAt = new Date('2026-01-01T10:00:00.000Z');

    expect(dto).toBeInstanceOf(MedicionManualItemResponseDto);
    expect(dto.id).toBe(1);
    expect(dto.parametro).toBe(Object.values(Parametro)[0]);
    expect(dto.valor).toBe(5);
    expect(dto.estado).toBe(Object.values(EstadoMedicion)[0]);
    expect(dto.createdAt).toEqual(new Date('2026-01-01T10:00:00.000Z'));
  });
});

describe('MedicionManualLoteResponseDto', () => {
  it('debería crear la respuesta de mediciones manuales de un lote', () => {
    const medicion = new MedicionManualItemResponseDto();
    medicion.id = 1;
    medicion.parametro = Object.values(Parametro)[0] as Parametro;
    medicion.valor = 4.5;
    medicion.estado = Object.values(EstadoMedicion)[0] as EstadoMedicion;
    medicion.createdAt = new Date('2026-01-01T10:00:00.000Z');

    const dto = new MedicionManualLoteResponseDto();
    dto.loteId = 10;
    dto.tipoMateriaPrima = Object.values(TipoMateriaPrima)[0] as TipoMateriaPrima;
    dto.usuarioId = 20;
    dto.mediciones = [medicion];

    expect(dto).toBeInstanceOf(MedicionManualLoteResponseDto);
    expect(dto.loteId).toBe(10);
    expect(dto.tipoMateriaPrima).toBe(Object.values(TipoMateriaPrima)[0]);
    expect(dto.usuarioId).toBe(20);
    expect(dto.mediciones).toHaveLength(1);
    expect(dto.mediciones[0]).toBeInstanceOf(MedicionManualItemResponseDto);
    expect(dto.mediciones[0].valor).toBe(4.5);
  });

  it('debería permitir una lista vacía de mediciones', () => {
    const dto = new MedicionManualLoteResponseDto();
    dto.loteId = 10;
    dto.tipoMateriaPrima = Object.values(TipoMateriaPrima)[0] as TipoMateriaPrima;
    dto.usuarioId = 20;
    dto.mediciones = [];

    expect(dto.mediciones).toEqual([]);
  });
});

describe('HistorialMedicionManualResponseDto', () => {
  it('debería crear el historial con datos y paginación', () => {
    const medicion = new MedicionManualItemResponseDto();
    medicion.id = 1;
    medicion.parametro = Object.values(Parametro)[0] as Parametro;
    medicion.valor = 6;
    medicion.estado = Object.values(EstadoMedicion)[0] as EstadoMedicion;
    medicion.createdAt = new Date('2026-01-01T10:00:00.000Z');

    const dto = new HistorialMedicionManualResponseDto();
    dto.data = [medicion];
    dto.total = 25;
    dto.page = 2;
    dto.limit = 10;

    expect(dto).toBeInstanceOf(HistorialMedicionManualResponseDto);
    expect(dto.data).toHaveLength(1);
    expect(dto.data[0]).toBeInstanceOf(MedicionManualItemResponseDto);
    expect(dto.data[0].id).toBe(1);
    expect(dto.total).toBe(25);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('debería permitir un historial sin registros', () => {
    const dto = new HistorialMedicionManualResponseDto();
    dto.data = [];
    dto.total = 0;
    dto.page = 1;
    dto.limit = 10;

    expect(dto.data).toEqual([]);
    expect(dto.total).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });
});
