import { ValidationArguments } from 'class-validator';
import { UmbralAlertaCoherenteValidator } from '../validators/umbral-alerta-coherente.validator';

describe('UmbralAlertaCoherenteValidator', () => {
  let validator: UmbralAlertaCoherenteValidator;

  const dtoBase = {
    umbralAlertaMin: 2,
    umbralMin: 5,
    umbralMax: 10,
  };

  const argsDe = (
    object: Record<string, unknown>,
  ): ValidationArguments => ({
    object,
    property: 'umbralAlertaMax',
    value: 12,
    constraints: [],
    targetName: 'TestDto',
  });

  const validar = (
    umbralAlertaMax: unknown,
    object: Record<string, unknown> = dtoBase,
  ) => validator.validate(umbralAlertaMax as number, argsDe(object));

  beforeEach(() => {
    validator = new UmbralAlertaCoherenteValidator();
  });

  describe('validate — coherencia numérica', () => {
    it('devuelve true cuando la banda de alerta envuelve a la normal', () => {
      expect(validar(12)).toBe(true);
    });

    it('devuelve true cuando ambas bandas coinciden en sus límites', () => {
      expect(
        validar(10, {
          umbralAlertaMin: 5,
          umbralMin: 5,
          umbralMax: 10,
        }),
      ).toBe(true);
    });

    it('devuelve false cuando umbralAlertaMin es mayor que umbralMin', () => {
      expect(
        validar(12, {
          umbralAlertaMin: 6,
          umbralMin: 5,
          umbralMax: 10,
        }),
      ).toBe(false);
    });

    it('devuelve false cuando umbralMax es mayor que umbralAlertaMax', () => {
      expect(validar(9)).toBe(false);
    });

    it('devuelve false cuando ambas condiciones son incoherentes', () => {
      expect(
        validar(9, {
          umbralAlertaMin: 6,
          umbralMin: 5,
          umbralMax: 10,
        }),
      ).toBe(false);
    });

    it('acepta cero y valores negativos si los límites son coherentes', () => {
      expect(
        validar(5, {
          umbralAlertaMin: -5,
          umbralMin: 0,
          umbralMax: 3,
        }),
      ).toBe(true);
    });
  });

  describe('validate — tipos no numéricos', () => {
    it.each([
      ['umbralAlertaMin', { ...dtoBase, umbralAlertaMin: undefined }],
      ['umbralMin', { ...dtoBase, umbralMin: null }],
      ['umbralMax', { ...dtoBase, umbralMax: '10' }],
    ])('devuelve true cuando %s no es number', (_campo, objeto) => {
      expect(validar(12, objeto)).toBe(true);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['string', '12'],
    ])('devuelve true cuando umbralAlertaMax es %s', (_tipo, valor) => {
      expect(validar(valor)).toBe(true);
    });

    it('devuelve true si falta umbralAlertaMin', () => {
      expect(
        validar(12, {
          umbralMin: 5,
          umbralMax: 10,
        }),
      ).toBe(true);
    });

    it('devuelve true si falta umbralMin', () => {
      expect(
        validar(12, {
          umbralAlertaMin: 2,
          umbralMax: 10,
        }),
      ).toBe(true);
    });

    it('devuelve true si falta umbralMax', () => {
      expect(
        validar(12, {
          umbralAlertaMin: 2,
          umbralMin: 5,
        }),
      ).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('devuelve el mensaje de error esperado', () => {
      expect(validator.defaultMessage()).toBe(
        'umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax',
      );
    });
  });
});