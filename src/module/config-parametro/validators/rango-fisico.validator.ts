import {
  ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments,
} from 'class-validator';
import { RANGOS_FISICOS } from './rangos-fisicos.constant';

@ValidatorConstraint({ name: 'rangoFisico', async: false })
export class RangoFisicoValidator implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments): boolean {
    const obj = args.object as any;
    const rango = RANGOS_FISICOS[obj.parametro as keyof typeof RANGOS_FISICOS];
    if (!rango) return true;
    return typeof value === 'number' && value >= rango.min && value <= rango.max;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as any;
    const rango = RANGOS_FISICOS[obj.parametro as keyof typeof RANGOS_FISICOS];
    return rango
      ? `El valor para ${obj.parametro} debe estar entre ${rango.min} y ${rango.max}`
      : 'Valor fuera de rango físico posible';
  }
}