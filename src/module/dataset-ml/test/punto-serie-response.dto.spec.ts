import {
  OrigenPuntoSerie,
  PuntoSerieResponseDto,
} from '../dto/punto-serie-response.dto';

describe('PuntoSerieResponseDto — Cobertura de DTO de punto de serie (HU-50)', () => {
  it('debe instanciar correctamente la clase PuntoSerieResponseDto con todos sus campos', () => {
    const dto = new PuntoSerieResponseDto();
    dto.loteId = 10;
    dto.valor = 4.5;
    dto.timestamp = new Date('2026-01-15T10:00:00Z');
    dto.origen = OrigenPuntoSerie.SENSOR;

    expect(dto).toBeInstanceOf(PuntoSerieResponseDto);
    expect(dto.loteId).toBe(10);
    expect(dto.valor).toBe(4.5);
    expect(dto.timestamp).toEqual(new Date('2026-01-15T10:00:00Z'));
    expect(dto.origen).toBe(OrigenPuntoSerie.SENSOR);
  });

  it('debe admitir los distintos orígenes contemplados por el enum OrigenPuntoSerie', () => {
    const dtoFallback = new PuntoSerieResponseDto();
    dtoFallback.origen = OrigenPuntoSerie.MANUAL_FALLBACK;

    const dtoSinSensor = new PuntoSerieResponseDto();
    dtoSinSensor.origen = OrigenPuntoSerie.MANUAL_SIN_SENSOR;

    expect(dtoFallback.origen).toBe('manual');
    expect(dtoSinSensor.origen).toBe('manual_sin_sensor');
  });
});