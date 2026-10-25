import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { esFechaCalendarioValida } from '../../../common/utils/rango-fechas';

@ValidatorConstraint({ name: 'fechaCalendario', async: false })
export class FechaCalendarioValidator implements ValidatorConstraintInterface {
  validate(valor: unknown): boolean {
    // La ausencia la reporta @IsDefined; acá solo se valida el formato.
    if (valor === undefined || valor === null) return true;
    return esFechaCalendarioValida(valor);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe ser una fecha válida con formato YYYY-MM-DD`;
  }
}

@ValidatorConstraint({ name: 'rangoFechasCoherente', async: false })
export class RangoFechasCoherenteValidator implements ValidatorConstraintInterface {
  validate(hasta: unknown, args: ValidationArguments): boolean {
    const { desde } = args.object as { desde?: unknown };
    // Si alguna fecha es inválida, ya lo reporta FechaCalendarioValidator.
    if (!esFechaCalendarioValida(desde) || !esFechaCalendarioValida(hasta)) {
      return true;
    }
    // YYYY-MM-DD se ordena lexicográficamente igual que cronológicamente.
    return desde <= hasta;
  }

  defaultMessage(): string {
    return 'La fecha "desde" no puede ser posterior a la fecha "hasta"';
  }
}
