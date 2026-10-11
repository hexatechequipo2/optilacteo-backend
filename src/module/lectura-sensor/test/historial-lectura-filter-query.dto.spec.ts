import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HistorialLecturaFilterQueryDto } from '../dto/historial-lectura-filter-query.dto';

describe('HistorialLecturaFilterQueryDto', () => {
  const transformar = (data: Record<string, unknown>) =>
    plainToInstance(HistorialLecturaFilterQueryDto, data);

  const obtenerErrores = async (data: Record<string, unknown>) => {
    const dto = transformar(data);
    return validate(dto);
  };

  describe('valores por defecto', () => {
    it('asigna page = 1 y limit = 20', () => {
      const dto = transformar({});

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('permite omitir todos los filtros opcionales', async () => {
      const errores = await obtenerErrores({});

      expect(errores).toHaveLength(0);
    });
  });

  describe('fechaInicio', () => {
    it('acepta una fecha ISO 8601 válida', async () => {
      const errores = await obtenerErrores({
        fechaInicio: '2025-01-01T00:00:00.000Z',
      });

      expect(errores).toHaveLength(0);
    });

    it('rechaza una fecha inválida', async () => {
      const errores = await obtenerErrores({
        fechaInicio: 'fecha-invalida',
      });

      expect(errores.some((error) => error.property === 'fechaInicio')).toBe(
        true,
      );
    });

    it('acepta fechaInicio omitida', async () => {
      const errores = await obtenerErrores({});

      expect(
        errores.some((error) => error.property === 'fechaInicio'),
      ).toBe(false);
    });
  });

  describe('fechaFin', () => {
    it('acepta una fecha ISO 8601 válida', async () => {
      const errores = await obtenerErrores({
        fechaFin: '2025-01-31T23:59:59.000Z',
      });

      expect(errores).toHaveLength(0);
    });

    it('rechaza una fecha inválida', async () => {
      const errores = await obtenerErrores({
        fechaFin: 'no-es-una-fecha',
      });

      expect(errores.some((error) => error.property === 'fechaFin')).toBe(
        true,
      );
    });

    it('acepta fechaFin omitida', async () => {
      const errores = await obtenerErrores({});

      expect(errores.some((error) => error.property === 'fechaFin')).toBe(
        false,
      );
    });
  });

  describe('loteCodigo', () => {
    it('acepta un código de lote de tipo string', async () => {
      const errores = await obtenerErrores({
        loteCodigo: 'LOTE-1-00001',
      });

      expect(errores).toHaveLength(0);
    });

    it('rechaza un código de lote que no sea string', async () => {
      const errores = await obtenerErrores({
        loteCodigo: 123,
      });

      expect(errores.some((error) => error.property === 'loteCodigo')).toBe(
        true,
      );
    });

    it('permite omitir el código de lote', async () => {
      const errores = await obtenerErrores({});

      expect(errores.some((error) => error.property === 'loteCodigo')).toBe(
        false,
      );
    });
  });

  describe('page', () => {
    it('acepta un número entero mayor o igual a 1', async () => {
      const dto = transformar({ page: '3' });
      const errores = await validate(dto);

      expect(dto.page).toBe(3);
      expect(errores).toHaveLength(0);
    });

    it('rechaza page menor que 1', async () => {
      const errores = await obtenerErrores({ page: '0' });

      expect(errores.some((error) => error.property === 'page')).toBe(true);
    });

    it('rechaza page negativa', async () => {
      const errores = await obtenerErrores({ page: '-1' });

      expect(errores.some((error) => error.property === 'page')).toBe(true);
    });

    it('rechaza page decimal', async () => {
      const errores = await obtenerErrores({ page: '1.5' });

      expect(errores.some((error) => error.property === 'page')).toBe(true);
    });

    it('rechaza page no numérica', async () => {
      const errores = await obtenerErrores({ page: 'abc' });

      expect(errores.some((error) => error.property === 'page')).toBe(true);
    });

    it('acepta page omitida y conserva el valor por defecto', async () => {
      const dto = transformar({});
      const errores = await validate(dto);

      expect(dto.page).toBe(1);
      expect(errores).toHaveLength(0);
    });

    it('permite page null por IsOptional', async () => {
      const errores = await obtenerErrores({ page: null });

      expect(errores.some((error) => error.property === 'page')).toBe(false);
    });
  });

  describe('limit', () => {
    it('acepta un número entero mayor o igual a 1', async () => {
      const dto = transformar({ limit: '50' });
      const errores = await validate(dto);

      expect(dto.limit).toBe(50);
      expect(errores).toHaveLength(0);
    });

    it('rechaza limit menor que 1', async () => {
      const errores = await obtenerErrores({ limit: '0' });

      expect(errores.some((error) => error.property === 'limit')).toBe(true);
    });

    it('rechaza limit negativo', async () => {
      const errores = await obtenerErrores({ limit: '-5' });

      expect(errores.some((error) => error.property === 'limit')).toBe(true);
    });

    it('rechaza limit decimal', async () => {
      const errores = await obtenerErrores({ limit: '2.5' });

      expect(errores.some((error) => error.property === 'limit')).toBe(true);
    });

    it('rechaza limit no numérico', async () => {
      const errores = await obtenerErrores({ limit: 'muchos' });

      expect(errores.some((error) => error.property === 'limit')).toBe(true);
    });

    it('acepta limit omitido y conserva el valor por defecto', async () => {
      const dto = transformar({});
      const errores = await validate(dto);

      expect(dto.limit).toBe(20);
      expect(errores).toHaveLength(0);
    });

    it('permite limit null por IsOptional', async () => {
      const errores = await obtenerErrores({ limit: null });

      expect(errores.some((error) => error.property === 'limit')).toBe(false);
    });
  });

  describe('combinación de filtros', () => {
    it('acepta todos los filtros con valores válidos', async () => {
      const dto = transformar({
        fechaInicio: '2025-01-01T00:00:00.000Z',
        fechaFin: '2025-01-31T23:59:59.000Z',
        loteCodigo: 'LOTE-1-00001',
        page: '2',
        limit: '10',
      });

      const errores = await validate(dto);

      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(10);
      expect(errores).toHaveLength(0);
    });
  });
});