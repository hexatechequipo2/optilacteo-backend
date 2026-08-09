import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { TrazabilidadEntidadDto } from '../../audit/dto/trazabilidad.dto';

export class ConfigParametroResponseDto {
  id!: number;
  empresaId!: number;
  parametro!: Parametro;
  tipoMateriaPrima!: TipoMateriaPrima;
  umbralMin!: number;
  umbralMax!: number;
  createdAt!: Date;
  updatedAt!: Date;
  auditoria?: TrazabilidadEntidadDto;
}
