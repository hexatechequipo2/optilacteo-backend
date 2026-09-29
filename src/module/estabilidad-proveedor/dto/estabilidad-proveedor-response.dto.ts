import type { DetalleEstabilidad } from '../entities/proveedor-estabilidad.entity';

export class EstabilidadProveedorResponseDto {
  status!: 'ok' | 'insufficient_data';
  mensaje?: string; // AC4: 'Sin datos suficientes'
  clasificacion?: string | null;
  score?: number;
  detalle?: DetalleEstabilidad[];
  cantidadLotes!: number;
  minimoLotes?: number;
  calculadoEn?: Date;
}