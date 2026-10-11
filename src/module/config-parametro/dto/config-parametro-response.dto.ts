import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { TrazabilidadEntidadDto } from '../../audit/dto/trazabilidad.dto';

export class ConfigParametroResponseDto {
  id!: number;
  empresaId!: number;
  parametro!: Parametro;
  tipoMateriaPrima!: TipoMateriaPrima;
  umbralAlertaMin!: number;
  umbralMin!: number;
  umbralMax!: number;
  umbralAlertaMax!: number;
  createdAt!: Date;
  updatedAt!: Date;
  auditoria?: TrazabilidadEntidadDto;
}
