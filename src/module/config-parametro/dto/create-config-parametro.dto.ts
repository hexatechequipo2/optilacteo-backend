import { IsEnum, IsNumber, Validate } from 'class-validator';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { RangoFisicoValidator } from '../validators/rango-fisico.validator';
import { UmbralCoherenteValidator } from '../validators/umbral-coherente.validator';
import { UmbralAlertaCoherenteValidator } from '../validators/umbral-alerta-coherente.validator';

export class CreateConfigParametroDto {
  @IsEnum(Parametro, { message: 'parametro inválido' })
  parametro!: Parametro;

  @IsEnum(TipoMateriaPrima, { message: 'tipoMateriaPrima inválido' })
  tipoMateriaPrima!: TipoMateriaPrima;

  // HU-40: piso de la banda amarilla. Debe ser <= umbralMin.
  @IsNumber({}, { message: 'umbralAlertaMin debe ser numérico' })
  @Validate(RangoFisicoValidator)
  umbralAlertaMin!: number;

  @IsNumber({}, { message: 'umbralMin debe ser numérico' })
  @Validate(RangoFisicoValidator)
  umbralMin!: number;

  @IsNumber({}, { message: 'umbralMax debe ser numérico' })
  @Validate(RangoFisicoValidator)
  @Validate(UmbralCoherenteValidator)
  umbralMax!: number;

  // HU-40: techo de la banda amarilla. Debe ser >= umbralMax.
  @IsNumber({}, { message: 'umbralAlertaMax debe ser numérico' })
  @Validate(RangoFisicoValidator)
  @Validate(UmbralAlertaCoherenteValidator)
  umbralAlertaMax!: number;
}