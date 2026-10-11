import { ConfiguracionSilencioResponseDto } from '../dto/configuracion-silencio-response.dto';

describe('ConfiguracionSilencioResponseDto', () => {
  it('debería crear una configuración de silencio con todas sus propiedades', () => {
    const fecha = new Date('2026-01-01T10:00:00.000Z');

    const dto = new ConfiguracionSilencioResponseDto();
    dto.id = 1;
    dto.nombre = 'Silencio nocturno';
    dto.horaInicio = '22:00';
    dto.horaFin = '07:00';
    dto.diasSemana = [1, 2, 3, 4, 5];
    dto.empresaId = 10;
    dto.createdAt = fecha;
    dto.updatedAt = fecha;

    expect(dto).toBeInstanceOf(ConfiguracionSilencioResponseDto);
    expect(dto.id).toBe(1);
    expect(dto.nombre).toBe('Silencio nocturno');
    expect(dto.horaInicio).toBe('22:00');
    expect(dto.horaFin).toBe('07:00');
    expect(dto.diasSemana).toEqual([1, 2, 3, 4, 5]);
    expect(dto.empresaId).toBe(10);
    expect(dto.createdAt).toEqual(fecha);
    expect(dto.updatedAt).toEqual(fecha);
  });

  it('debería permitir nombre y diasSemana nulos', () => {
    const fecha = new Date('2026-01-01T10:00:00.000Z');

    const dto = Object.assign(new ConfiguracionSilencioResponseDto(), {
      id: 2,
      nombre: null,
      horaInicio: '23:00',
      horaFin: '06:00',
      diasSemana: null,
      empresaId: 10,
      createdAt: fecha,
      updatedAt: fecha,
    });

    expect(dto.nombre).toBeNull();
    expect(dto.diasSemana).toBeNull();
  });

  it('debería permitir nombre y diasSemana sin definir', () => {
    const fecha = new Date('2026-01-02T10:00:00.000Z');

    const dto = Object.assign(new ConfiguracionSilencioResponseDto(), {
      id: 3,
      horaInicio: '00:00',
      horaFin: '08:00',
      empresaId: 10,
      createdAt: fecha,
      updatedAt: fecha,
    });

    expect(dto.nombre).toBeUndefined();
    expect(dto.diasSemana).toBeUndefined();
  });

  it('debería permitir una lista vacía de diasSemana', () => {
    const fecha = new Date('2026-01-03T10:00:00.000Z');

    const dto = Object.assign(new ConfiguracionSilencioResponseDto(), {
      id: 4,
      nombre: 'Sin días específicos',
      horaInicio: '21:00',
      horaFin: '06:00',
      diasSemana: [],
      empresaId: 10,
      createdAt: fecha,
      updatedAt: fecha,
    });

    expect(dto.diasSemana).toEqual([]);
    expect(dto.diasSemana).toHaveLength(0);
  });

  it('debería conservar los datos al asignar un objeto', () => {
    const datos = {
      id: 5,
      nombre: 'Fin de semana',
      horaInicio: '01:00',
      horaFin: '08:00',
      diasSemana: [0, 6],
      empresaId: 20,
      createdAt: new Date('2026-02-01T10:00:00.000Z'),
      updatedAt: new Date('2026-02-02T10:00:00.000Z'),
    };

    const dto = Object.assign(new ConfiguracionSilencioResponseDto(), datos);

    expect(dto).toEqual(datos);
  });
});
