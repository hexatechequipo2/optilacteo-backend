// HU-51: unidad de la cantidad ingresada de un lote. Distinto de
// UnidadRendimiento (que además admite 'porcentaje', válido solo para
// rendimiento de proceso, no para una cantidad de recepción).
export enum UnidadCantidad {
  LITROS = 'litros',
  KILOGRAMOS = 'kilogramos',
}