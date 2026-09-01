import { ValidationArguments } from 'class-validator';
import { UmbralCoherenteValidator } from '../validators/umbral-coherente.validator';

describe('UmbralCoherenteValidator', () => {
  let validator: UmbralCoherenteValidator;

  beforeEach(() => {
    validator = new UmbralCoherenteValidator();
  });

  describe('validate', () => {
    it('debe retornar true si umbralMax es estrictamente mayor que umbralMin', () => {
      const args: ValidationArguments = {
        object: { umbralMin: 10 },
        property: 'umbralMax',
        value: 20,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(20, args)).toBe(true);
    });

    it('debe retornar false si umbralMax es igual a umbralMin', () => {
      const args: ValidationArguments = {
        object: { umbralMin: 15 },
        property: 'umbralMax',
        value: 15,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(15, args)).toBe(false);
    });

    it('debe retornar false si umbralMax es menor que umbralMin', () => {
      const args: ValidationArguments = {
        object: { umbralMin: 20 },
        property: 'umbralMax',
        value: 10,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(10, args)).toBe(false);
    });

    it('debe retornar true si umbralMin no es de tipo number (ej. undefined, null o string)', () => {
      const argsUndefined: ValidationArguments = {
        object: { umbralMin: undefined },
        property: 'umbralMax',
        value: 20,
        constraints: [],
        targetName: 'TestDto',
      };

      const argsString: ValidationArguments = {
        object: { umbralMin: '10' },
        property: 'umbralMax',
        value: 20,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(20, argsUndefined)).toBe(true);
      expect(validator.validate(20, argsString)).toBe(true);
    });

    it('debe retornar true si umbralMax no es de tipo number', () => {
      const args: ValidationArguments = {
        object: { umbralMin: 10 },
        property: 'umbralMax',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value: '20' as any,
        constraints: [],
        targetName: 'TestDto',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(validator.validate('20' as any, args)).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('debe retornar el mensaje de error por defecto esperado', () => {
      const message = validator.defaultMessage();

      expect(message).toBe('umbralMax debe ser mayor a umbralMin');
    });
  });
});
