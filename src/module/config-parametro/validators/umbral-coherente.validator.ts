import {
  ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'umbralCoherente', async: false })
export class UmbralCoherenteValidator implements ValidatorConstraintInterface {
  validate(umbralMax: number, args: ValidationArguments): boolean {
    const obj = args.object as any;
    if (typeof obj.umbralMin !== 'number' || typeof umbralMax !== 'number') return true;
    return umbralMax > obj.umbralMin;
  }

  defaultMessage(): string {
    return 'umbralMax debe ser mayor a umbralMin';
  }
}