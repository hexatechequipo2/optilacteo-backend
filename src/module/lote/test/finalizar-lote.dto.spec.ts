import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FinalizarLoteDto } from '../dto/finalizar-lote.dto';
import { UnidadRendimiento } from '../enums/unidad-rendimiento.enum';

describe('FinalizarLoteDto', () => {
  describe('Validación del DTO', () => {
    it('debería ser válido cuando no se informa rendimiento ni unidadRendimiento', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {});

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('debería ser válido cuando se informa rendimiento y una unidad válida', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: 87.5,
        unidadRendimiento: UnidadRendimiento.PORCENTAJE,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('debería transformar el rendimiento recibido como string a number', () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: '87.5',
        unidadRendimiento: UnidadRendimiento.PORCENTAJE,
      });

      expect(dto.rendimiento).toBe(87.5);
      expect(typeof dto.rendimiento).toBe('number');
    });

    it('debería generar un error cuando el rendimiento no es numérico', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: 'valor-invalido',
        unidadRendimiento: UnidadRendimiento.PORCENTAJE,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const rendimientoError = errors.find(
        (error) => error.property === 'rendimiento',
      );

      expect(rendimientoError).toBeDefined();
      expect(rendimientoError?.constraints).toHaveProperty('isNumber');
    });

    it('debería generar un error cuando el rendimiento es negativo', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: -10,
        unidadRendimiento: UnidadRendimiento.PORCENTAJE,
      });

      const errors = await validate(dto);

      const rendimientoError = errors.find(
        (error) => error.property === 'rendimiento',
      );

      expect(rendimientoError).toBeDefined();
      expect(rendimientoError?.constraints).toHaveProperty('min');
    });

    it('debería generar un error cuando se informa rendimiento sin unidadRendimiento', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: 87.5,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const unidadError = errors.find(
        (error) => error.property === 'unidadRendimiento',
      );

      expect(unidadError).toBeDefined();
      expect(unidadError?.constraints).toHaveProperty('isEnum');
    });

    it('debería generar un error cuando unidadRendimiento no pertenece al enum', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: 87.5,
        unidadRendimiento: 'UNIDAD_INVALIDA',
      });

      const errors = await validate(dto);

      const unidadError = errors.find(
        (error) => error.property === 'unidadRendimiento',
      );

      expect(unidadError).toBeDefined();
      expect(unidadError?.constraints).toHaveProperty('isEnum');
    });

    it('debería aceptar un rendimiento igual a cero', async () => {
      const dto = plainToInstance(FinalizarLoteDto, {
        rendimiento: 0,
        unidadRendimiento: UnidadRendimiento.PORCENTAJE,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
