import {
  DestinoProductivoRefDto,
  RecomendacionPendienteResponseDto,
} from '../dto/recomendacion-pendiente-response.dto';

describe('DestinoProductivoRefDto', () => {
  it('debe crear una referencia de destino con id y nombre', () => {
    const dto = new DestinoProductivoRefDto();

    dto.id = 10;
    dto.nombre = 'Cámara de refrigeración';

    expect(dto).toEqual({
      id: 10,
      nombre: 'Cámara de refrigeración',
    });
  });
});

describe('RecomendacionPendienteResponseDto', () => {
  it('debe representar una recomendación pendiente', () => {
    const destino = new DestinoProductivoRefDto();
    destino.id = 10;
    destino.nombre = 'Cámara de refrigeración';

    const dto = new RecomendacionPendienteResponseDto();

    dto.id = 1;
    dto.destinoRecomendado = destino;
    dto.confianza = 0.95;
    dto.estado = 'pendiente';
    dto.destinoReal = null;
    dto.justificacion = null;

    expect(dto).toEqual({
      id: 1,
      destinoRecomendado: {
        id: 10,
        nombre: 'Cámara de refrigeración',
      },
      confianza: 0.95,
      estado: 'pendiente',
      destinoReal: null,
      justificacion: null,
    });
  });

  it('debe representar una recomendación aceptada con destino real', () => {
    const recomendado = new DestinoProductivoRefDto();
    recomendado.id = 10;
    recomendado.nombre = 'Cámara A';

    const real = new DestinoProductivoRefDto();
    real.id = 20;
    real.nombre = 'Cámara B';

    const dto = new RecomendacionPendienteResponseDto();

    dto.id = 2;
    dto.destinoRecomendado = recomendado;
    dto.confianza = 0.87;
    dto.estado = 'aceptada';
    dto.destinoReal = real;
    dto.justificacion = 'La cámara recomendada estaba ocupada';

    expect(dto.estado).toBe('aceptada');
    expect(dto.destinoRecomendado.nombre).toBe('Cámara A');
    expect(dto.destinoReal).toEqual({
      id: 20,
      nombre: 'Cámara B',
    });
    expect(dto.justificacion).toBe(
      'La cámara recomendada estaba ocupada',
    );
  });

  it('debe representar una recomendación rechazada', () => {
    const destino = new DestinoProductivoRefDto();
    destino.id = 30;
    destino.nombre = 'Depósito';

    const dto = new RecomendacionPendienteResponseDto();

    dto.id = 3;
    dto.destinoRecomendado = destino;
    dto.confianza = 0.6;
    dto.estado = 'rechazada';
    dto.destinoReal = null;
    dto.justificacion = 'El producto requiere otra ubicación';

    expect(dto.estado).toBe('rechazada');
    expect(dto.destinoReal).toBeNull();
    expect(dto.justificacion).toBe(
      'El producto requiere otra ubicación',
    );
  });
});