import { HistorialLecturaResponseDto } from '../dto/historial-lectura-response.dto';
import { LecturaHistorialItemDto } from '../dto/lectura-historial-item.dto';

describe('HistorialLecturaResponseDto', () => {
  it('debe crear una respuesta con todos sus campos', () => {
    const data = [
      {
        id: 1,
        valor: 6.5,
      },
    ] as LecturaHistorialItemDto[];

    const dto = Object.assign(new HistorialLecturaResponseDto(), {
      data,
      total: 1,
      page: 1,
      limit: 20,
      rangoAmplio: false,
    });

    expect(dto).toBeInstanceOf(HistorialLecturaResponseDto);
    expect(dto.data).toEqual(data);
    expect(dto.total).toBe(1);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.rangoAmplio).toBe(false);
  });

  it('debe permitir indicar que el rango consultado es amplio', () => {
    const dto = Object.assign(new HistorialLecturaResponseDto(), {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      rangoAmplio: true,
    });

    expect(dto.rangoAmplio).toBe(true);
    expect(dto.data).toEqual([]);
    expect(dto.total).toBe(0);
  });
});
