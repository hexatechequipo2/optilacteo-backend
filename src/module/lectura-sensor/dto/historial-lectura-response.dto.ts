import { LecturaHistorialItemDto } from './lectura-historial-item.dto';

export class HistorialLecturaResponseDto {
  data!: LecturaHistorialItemDto[];
  total!: number;
  page!: number;
  limit!: number;
  // AC 8/9 de la HU-19: aviso explícito cuando el rango consultado supera
  // los 30 días que garantiza el SLA de performance (<3s).
  rangoAmplio!: boolean;
}
