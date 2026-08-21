import { ValidationArguments } from 'class-validator';
import { RangoFisicoValidator } from '../validators/rango-fisico.validator';
import { RANGOS_FISICOS } from '../validators/rangos-fisicos.constant';

describe('RangoFisicoValidator', () => {
  let validator: RangoFisicoValidator;

  // Tomamos el primer parámetro definido en la constante real para probar dinamismo
  const parametroExistente = Object.keys(RANGOS_FISICOS)[0] || 'TEMPERATURA';
  const rangoReal = RANGOS_FISICOS[parametroExistente as keyof typeof RANGOS_FISICOS] || {
    min: 0,
    max: 100,
  };

  beforeEach(() => {
    validator = new RangoFisicoValidator();
  });

  describe('validate', () => {
    it('debe retornar true si el valor está exactamente dentro del rango', () => {
      const valorMedio = (rangoReal.min + rangoReal.max) / 2;
      const args: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: valorMedio,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(valorMedio, args)).toBe(true);
    });

    it('debe retornar true en los límites exactos (min y max)', () => {
      const argsMin: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: rangoReal.min,
        constraints: [],
        targetName: 'TestDto',
      };

      const argsMax: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: rangoReal.max,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(rangoReal.min, argsMin)).toBe(true);
      expect(validator.validate(rangoReal.max, argsMax)).toBe(true);
    });

    it('debe retornar false si el valor es menor al mínimo permitido', () => {
      const args: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: rangoReal.min - 1,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(rangoReal.min - 1, args)).toBe(false);
    });

    it('debe retornar false si el valor es mayor al máximo permitido', () => {
      const args: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: rangoReal.max + 1,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(rangoReal.max + 1, args)).toBe(false);
    });

    it('debe retornar true si el parametro no está definido en RANGOS_FISICOS', () => {
      const args: ValidationArguments = {
        object: { parametro: 'PARAMETRO_INEXISTENTE_XYZ' },
        property: 'valor',
        value: 9999,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(9999, args)).toBe(true);
    });

    it('debe retornar true si el objeto no tiene la propiedad parametro', () => {
      const args: ValidationArguments = {
        object: {},
        property: 'valor',
        value: 50,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate(50, args)).toBe(true);
    });

    it('debe retornar false si el valor enviado no es de tipo number', () => {
      const args: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: '50' as any,
        constraints: [],
        targetName: 'TestDto',
      };

      expect(validator.validate('50' as any, args)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('debe retornar el mensaje formateado con min y max si el parámetro existe', () => {
      const args: ValidationArguments = {
        object: { parametro: parametroExistente },
        property: 'valor',
        value: rangoReal.max + 10,
        constraints: [],
        targetName: 'TestDto',
      };

      const message = validator.defaultMessage(args);

      expect(message).toBe(
        `El valor para ${parametroExistente} debe estar entre ${rangoReal.min} y ${rangoReal.max}`,
      );
    });

    it('debe retornar el mensaje genérico si el parámetro no existe en RANGOS_FISICOS', () => {
      const args: ValidationArguments = {
        object: { parametro: 'INEXISTENTE' },
        property: 'valor',
        value: 150,
        constraints: [],
        targetName: 'TestDto',
      };

      const message = validator.defaultMessage(args);

      expect(message).toBe('Valor fuera de rango físico posible');
    });
  });
});