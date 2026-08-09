import { SensorLoteHistorialResponseDto } from '../dto/sensor-lote-historial-response.dto';

describe('SensorLoteHistorialResponseDto', () => {
  it('debe instanciarse y asignar correctamente todas sus propiedades', () => {
    const fecha = new Date();
    const dto = new SensorLoteHistorialResponseDto();

    dto.id = 1;
    dto.sensorId = 10;
    dto.loteIdAnterior = 5;
    dto.loteIdNuevo = 8;
    dto.userId = 42;
    dto.userEmail = 'operario@optilacteo.com';
    dto.fecha = fecha;

    expect(dto.id).toBe(1);
    expect(dto.sensorId).toBe(10);
    expect(dto.loteIdAnterior).toBe(5);
    expect(dto.loteIdNuevo).toBe(8);
    expect(dto.userId).toBe(42);
    expect(dto.userEmail).toBe('operario@optilacteo.com');
    expect(dto.fecha).toBe(fecha);
  });

  it('debe permitir que loteIdAnterior sea null u opcional', () => {
    const dto = new SensorLoteHistorialResponseDto();

    dto.id = 2;
    dto.sensorId = 10;
    dto.loteIdAnterior = null;
    dto.loteIdNuevo = 8;
    dto.userId = 42;
    dto.fecha = new Date();

    expect(dto.loteIdAnterior).toBeNull();
  });
});
