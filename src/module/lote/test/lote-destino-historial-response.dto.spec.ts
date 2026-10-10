import { LoteDestinoHistorialResponseDto } from '../dto/lote-destino-historial-response.dto';

describe('LoteDestinoHistorialResponseDto', () => {
  const dtoData = {
    id: 1,
    loteId: 10,
    destinoProductivoId: 20,
    destinoProductivoNombre: 'Cultivo de maíz',
    destinoAnteriorId: 15,
    destinoAnteriorNombre: 'Cultivo de trigo',
    usuarioId: 5,
    origen: 'manual' as const,
    recomendacionDestinoId: null,
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
  };

  it('debería crear una instancia del DTO', () => {
    const dto = Object.assign(new LoteDestinoHistorialResponseDto(), dtoData);

    expect(dto).toBeInstanceOf(LoteDestinoHistorialResponseDto);
  });

  it('debería asignar correctamente todas las propiedades', () => {
    const dto = Object.assign(new LoteDestinoHistorialResponseDto(), dtoData);

    expect(dto.id).toBe(1);
    expect(dto.loteId).toBe(10);
    expect(dto.destinoProductivoId).toBe(20);
    expect(dto.destinoProductivoNombre).toBe('Cultivo de maíz');
    expect(dto.destinoAnteriorId).toBe(15);
    expect(dto.destinoAnteriorNombre).toBe('Cultivo de trigo');
    expect(dto.usuarioId).toBe(5);
    expect(dto.origen).toBe('manual');
    expect(dto.recomendacionDestinoId).toBeNull();
    expect(dto.createdAt).toEqual(new Date('2026-01-15T10:00:00.000Z'));
  });

  it('debería aceptar valores null para el destino anterior', () => {
    const dto = Object.assign(new LoteDestinoHistorialResponseDto(), {
      ...dtoData,
      destinoAnteriorId: null,
      destinoAnteriorNombre: null,
    });

    expect(dto.destinoAnteriorId).toBeNull();
    expect(dto.destinoAnteriorNombre).toBeNull();
  });

  it('debería aceptar el origen recomendacion_ml', () => {
    const dto = Object.assign(new LoteDestinoHistorialResponseDto(), {
      ...dtoData,
      origen: 'recomendacion_ml' as const,
      recomendacionDestinoId: 30,
    });

    expect(dto.origen).toBe('recomendacion_ml');
    expect(dto.recomendacionDestinoId).toBe(30);
  });

  it('debería conservar la fecha como instancia de Date', () => {
    const fecha = new Date('2026-03-20T12:30:00.000Z');
    const dto = Object.assign(new LoteDestinoHistorialResponseDto(), {
      ...dtoData,
      createdAt: fecha,
    });

    expect(dto.createdAt).toBeInstanceOf(Date);
    expect(dto.createdAt).toBe(fecha);
  });
});