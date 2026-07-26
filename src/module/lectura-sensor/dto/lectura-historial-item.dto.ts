import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstadoMedicion } from '../enums/estado-medicion.enum';

export class LecturaHistorialItemDto {
  id!: number;
  valor!: number;
  unidad!: string;
  sensorNombre!: string;
  parametro!: Parametro;
  loteCodigo!: string;
  timestampLectura!: Date;
  estado!: EstadoMedicion;
}