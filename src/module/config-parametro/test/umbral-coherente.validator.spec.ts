import { ValidationArguments } from 'class-validator';
import { UmbralCoherenteValidator } from '../validators/umbral-coherente.validator';

describe('UmbralCoherenteValidator', () => {
  let validator: UmbralCoherenteValidator;

  const argsDe = (
    object: Record<string, unknown>,
  ): ValidationArguments => ({
    object,
    property: 'umbralMax',
    value: 10,
    constraints: [],
    targetName: 'TestDto',
  });

  const validar = (
    umbralMax: unknown,
    object: Record<string, unknown>,
  ) => validator.validate(umbralMax as number, argsDe(object));

  beforeEach(() => {
    validator = new UmbralCoherenteValidator();
  });

  describe('validate — valores numéricos', () => {
    it('es válido cuando umbralMax es mayor que umbralMin', () => {
      expect(validar(10, { umbralMin: 5 })).toBe(true);
    });

    it('es inválido cuando umbralMax es igual a umbralMin', () => {
      expect(validar(5, { umbralMin: 5 })).toBe(false);
    });

    it('es inválido cuando umbralMax es menor que umbralMin', () => {
      expect(validar(3, { umbralMin: 5 })).toBe(false);
    });

    it('acepta valores negativos si umbralMax es mayor que umbralMin', () => {
      expect(validar(-2, { umbralMin: -5 })).toBe(true);
    });

    it('acepta cero si es mayor que umbralMin', () => {
      expect(validar(0, { umbralMin: -1 })).toBe(true);
    });
  });

  describe('validate — tipos no numéricos', () => {
    it('devuelve true si umbralMin no es number', () => {
      expect(validar(10, { umbralMin: '5' })).toBe(true);
    });

    it('devuelve true si umbralMin es null', () => {
      expect(validar(10, { umbralMin: null })).toBe(true);
    });

    it('devuelve true si umbralMin es undefined', () => {
      expect(validar(10, { umbralMin: undefined })).toBe(true);
    });

    it('devuelve true si falta umbralMin', () => {
      expect(validar(10, {})).toBe(true);
    });

    it('devuelve true si umbralMax no es number', () => {
      expect(validar('10', { umbralMin: 5 })).toBe(true);
    });

    it('devuelve true si umbralMax es null', () => {
      expect(validar(null, { umbralMin: 5 })).toBe(true);
    });

    it('devuelve true si umbralMax es undefined', () => {
      expect(validar(undefined, { umbralMin: 5 })).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('devuelve el mensaje de error esperado', () => {
      expect(validator.defaultMessage()).toBe(
        'umbralMax debe ser mayor a umbralMin',
      );
    });
  });
});