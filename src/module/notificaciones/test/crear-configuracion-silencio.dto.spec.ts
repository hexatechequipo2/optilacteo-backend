import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearConfiguracionSilencioDto } from '../dto/crear-configuracion-silencio.dto';

describe('CrearConfiguracionSilencioDto', () => {
  const crearDto = (data: Record<string, unknown>) =>
    plainToInstance(CrearConfiguracionSilencioDto, data);

  it('debería aceptar un DTO válido con todos los campos', async () => {
    const dto = crearDto({
      nombre: 'Turno nocturno',
      horaInicio: '22:00',
      horaFin: '06:00',
      diasSemana: [0, 6],
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería aceptar un DTO sin campos opcionales', async () => {
    const dto = crearDto({
      horaInicio: '08:00',
      horaFin: '16:30',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  describe('nombre', () => {
    it('debería aceptar un nombre válido', async () => {
      const dto = crearDto({
        nombre: 'Turno mañana',
        horaInicio: '08:00',
        horaFin: '16:00',
      });

      expect(await validate(dto)).toHaveLength(0);
    });

    it('debería aceptar un nombre vacío', async () => {
      const dto = crearDto({
        nombre: '',
        horaInicio: '08:00',
        horaFin: '16:00',
      });

      expect(await validate(dto)).toHaveLength(0);
    });

    it('debería rechazar un nombre que no sea string', async () => {
      const dto = crearDto({
        nombre: 123,
        horaInicio: '08:00',
        horaFin: '16:00',
      });

      const errores = await validate(dto);

      expect(errores.some((error) => error.property === 'nombre')).toBe(true);
    });

    it('debería rechazar un nombre de más de 80 caracteres', async () => {
      const dto = crearDto({
        nombre: 'a'.repeat(81),
        horaInicio: '08:00',
        horaFin: '16:00',
      });

      const errores = await validate(dto);

      const errorNombre = errores.find(
        (error) => error.property === 'nombre',
      );

      expect(errorNombre).toBeDefined();
      expect(errorNombre?.constraints).toHaveProperty('maxLength');
    });

    it('debería aceptar un nombre de exactamente 80 caracteres', async () => {
      const dto = crearDto({
        nombre: 'a'.repeat(80),
        horaInicio: '08:00',
        horaFin: '16:00',
      });

      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('horaInicio', () => {
    it.each(['00:00', '08:30', '12:45', '23:59'])(
      'debería aceptar la hora %s',
      async (horaInicio) => {
        const dto = crearDto({
          horaInicio,
          horaFin: '16:00',
        });

        expect(await validate(dto)).toHaveLength(0);
      },
    );

    it.each([
      '24:00',
      '25:00',
      '12:60',
      '8:30',
      '08:5',
      '0830',
      '',
      'abc',
    ])('debería rechazar la hora %s', async (horaInicio) => {
      const dto = crearDto({
        horaInicio,
        horaFin: '16:00',
      });

      const errores = await validate(dto);
      const error = errores.find(
        (item) => item.property === 'horaInicio',
      );

      expect(error).toBeDefined();
      expect(error?.constraints).toHaveProperty('matches');
      expect(error?.constraints?.matches).toBe(
        'horaInicio debe tener formato HH:mm',
      );
    });

    it('debería rechazar horaInicio faltante', async () => {
      const dto = crearDto({
        horaFin: '16:00',
      });

      const errores = await validate(dto);

      expect(
        errores.some((error) => error.property === 'horaInicio'),
      ).toBe(true);
    });
  });

  describe('horaFin', () => {
    it.each(['00:00', '06:30', '12:45', '23:59'])(
      'debería aceptar la hora %s',
      async (horaFin) => {
        const dto = crearDto({
          horaInicio: '08:00',
          horaFin,
        });

        expect(await validate(dto)).toHaveLength(0);
      },
    );

    it.each([
      '24:00',
      '10:60',
      '8:30',
      '10:5',
      '1000',
      '',
      'invalida',
    ])('debería rechazar la hora %s', async (horaFin) => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin,
      });

      const errores = await validate(dto);
      const error = errores.find((item) => item.property === 'horaFin');

      expect(error).toBeDefined();
      expect(error?.constraints).toHaveProperty('matches');
      expect(error?.constraints?.matches).toBe(
        'horaFin debe tener formato HH:mm',
      );
    });

    it('debería rechazar horaFin faltante', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
      });

      const errores = await validate(dto);

      expect(
        errores.some((error) => error.property === 'horaFin'),
      ).toBe(true);
    });
  });

  describe('diasSemana', () => {
    it('debería aceptar una lista válida de días', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [0, 1, 2, 3, 4, 5, 6],
      });

      expect(await validate(dto)).toHaveLength(0);
    });

    it('debería aceptar una lista vacía', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [],
      });

      expect(await validate(dto)).toHaveLength(0);
    });

    it('debería aceptar diasSemana omitido', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
      });

      expect(await validate(dto)).toHaveLength(0);
    });

    it('debería rechazar diasSemana cuando no es un array', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: '0,6',
      });

      const errores = await validate(dto);
      const error = errores.find(
        (item) => item.property === 'diasSemana',
      );

      expect(error).toBeDefined();
      expect(error?.constraints).toHaveProperty('isArray');
    });

    it('debería rechazar días duplicados', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [1, 1, 6],
      });

      const errores = await validate(dto);
      const error = errores.find(
        (item) => item.property === 'diasSemana',
      );

      expect(error).toBeDefined();
      expect(error?.constraints).toHaveProperty('arrayUnique');
    });

    it('debería rechazar valores que no sean enteros', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [1, 2.5, 6],
      });

      const errores = await validate(dto);

      expect(errores.some((error) => error.property === 'diasSemana')).toBe(
        true,
      );
    });

    it('debería rechazar días menores que 0', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [-1, 2],
      });

      const errores = await validate(dto);

      expect(errores.some((error) => error.property === 'diasSemana')).toBe(
        true,
      );
    });

    it('debería rechazar días mayores que 6', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [1, 7],
      });

      const errores = await validate(dto);

      expect(errores.some((error) => error.property === 'diasSemana')).toBe(
        true,
      );
    });

    it('debería rechazar elementos string dentro del array', async () => {
      const dto = crearDto({
        horaInicio: '08:00',
        horaFin: '16:00',
        diasSemana: [0, '6'],
      });

      const errores = await validate(dto);

      expect(errores.some((error) => error.property === 'diasSemana')).toBe(
        true,
      );
    });
  });
});