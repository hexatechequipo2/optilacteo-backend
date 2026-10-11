export class SerieProveedorResponseDto {
  proveedorId!: number;
  proveedorNombre!: string;
  cantidadLotes!: number;
  series!: {
    parametro: string;
    materiaPrima: string;
    valores: number[];
    umbralMin: number | null;
    umbralMax: number | null;
  }[];
}