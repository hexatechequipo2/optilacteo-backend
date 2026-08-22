import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IngresoCamaraFilterQueryDto } from '../dto/ingreso-camara-filter-query.dto';

describe('IngresoCamaraFilterQueryDto', () => {
  describe('Validación de filtros', () => {
    it('debería ser válido cuando no se informa ningún filtro', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {},
      );

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('debería ser válido cuando se informa únicamente skuId', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          skuId: 10,
        },
      );

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('debería ser válido cuando se informan skuId, page y limit', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          skuId: 10,
          page: 2,
          limit: 20,
        },
      );

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('debería transformar skuId, page y limit de string a number', () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          skuId: '10',
          page: '2',
          limit: '20',
        },
      );

      expect(dto.skuId).toBe(10);
      expect(typeof dto.skuId).toBe('number');

      expect(dto.page).toBe(2);
      expect(typeof dto.page).toBe('number');

      expect(dto.limit).toBe(20);
      expect(typeof dto.limit).toBe('number');
    });

    it('debería generar un error cuando skuId es decimal', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          skuId: 10.5,
        },
      );

      const errors = await validate(dto);

      const skuError = errors.find(
        (error) => error.property === 'skuId',
      );

      expect(skuError).toBeDefined();
      expect(skuError?.constraints).toHaveProperty('isInt');
    });

    it('debería generar un error cuando page es decimal', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          page: 1.5,
        },
      );

      const errors = await validate(dto);

      const pageError = errors.find(
        (error) => error.property === 'page',
      );

      expect(pageError).toBeDefined();
      expect(pageError?.constraints).toHaveProperty('isInt');
    });

    it('debería generar un error cuando limit es decimal', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          limit: 20.5,
        },
      );

      const errors = await validate(dto);

      const limitError = errors.find(
        (error) => error.property === 'limit',
      );

      expect(limitError).toBeDefined();
      expect(limitError?.constraints).toHaveProperty('isInt');
    });

    it('debería generar un error cuando skuId no puede convertirse en un número entero', async () => {
      const dto = plainToInstance(
        IngresoCamaraFilterQueryDto,
        {
          skuId: 'abc',
        },
      );

      const errors = await validate(dto);

      const skuError = errors.find(
        (error) => error.property === 'skuId',
      );

      expect(skuError).toBeDefined();
      expect(skuError?.constraints).toHaveProperty('isInt');
    });
  });
});