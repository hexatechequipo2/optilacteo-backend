import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'umbralAlertaCoherente', async: false })
export class UmbralAlertaCoherenteValidator
  implements ValidatorConstraintInterface
{
  validate(umbralAlertaMax: number, args: ValidationArguments): boolean {
    const obj = args.object as {
      umbralAlertaMin?: unknown;
      umbralMin?: unknown;
      umbralMax?: unknown;
    };

    if (
      typeof obj.umbralAlertaMin !== 'number' ||
      typeof obj.umbralMin !== 'number' ||
      typeof obj.umbralMax !== 'number' ||
      typeof umbralAlertaMax !== 'number'
    ) {
      // Deja que los @IsNumber de cada campo reporten el error de tipo.
      return true;
    }

    return (
      obj.umbralAlertaMin <= obj.umbralMin && obj.umbralMax <= umbralAlertaMax
    );
  }

  defaultMessage(): string {
    return 'umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax';
  }
}