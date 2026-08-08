import { IsEnum, IsNumber, Validate } from 'class-validator';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { RangoFisicoValidator } from '../validators/rango-fisico.validator';
import { UmbralCoherenteValidator } from '../validators/umbral-coherente.validator';

export class CreateConfigParametroDto {
  @IsEnum(Parametro, { message: 'parametro inválido' })
  parametro!: Parametro;

  @IsEnum(TipoMateriaPrima, { message: 'tipoMateriaPrima inválido' })
  tipoMateriaPrima!: TipoMateriaPrima;

  @IsNumber({}, { message: 'umbralMin debe ser numérico' })
  @Validate(RangoFisicoValidator)
  umbralMin!: number;

  @IsNumber({}, { message: 'umbralMax debe ser numérico' })
  @Validate(RangoFisicoValidator)
  @Validate(UmbralCoherenteValidator)
  umbralMax!: number;
}