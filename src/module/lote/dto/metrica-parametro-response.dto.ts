import { Parametro } from '../../config-parametro/enums/parametro.enum';

export class MetricaParametroResponseDto {
  parametro!: Parametro;
  valor!: number;
  unidad!: string;
  umbralMin!: number | null;
  umbralMax!: number | null;
  fueraDeRango!: boolean;
  timestampLectura!: Date;
}
