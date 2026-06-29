import { Plan } from '../enums/plan.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';

export interface PlanDetalle {
  precioMensual: number;
  maxUsuarios: number;
  maxSensores: number;
  modulos: ModuloSistema[];
}

export const DETALLE_POR_PLAN: Record<Plan, PlanDetalle> = {
  [Plan.STARTER]: {
    precioMensual: 20,
    maxUsuarios: 5,
    maxSensores: 10,
    modulos: [ModuloSistema.DASHBOARD, ModuloSistema.RECEPCION],
  },
  [Plan.PRO]: {
    precioMensual: 50,
    maxUsuarios: 20,
    maxSensores: 60,
    modulos: [
      ModuloSistema.DASHBOARD,
      ModuloSistema.RECEPCION,
      ModuloSistema.DESTINO_PRODUCTIVO_IA,
      ModuloSistema.MONITOREO_ALERTAS,
      ModuloSistema.SENSORES_IOT,
      ModuloSistema.TRAZABILIDAD,
      ModuloSistema.REPORTES_FORECAST,
    ],
  },
  [Plan.ENTERPRISE]: {
    precioMensual: 100,
    maxUsuarios: 100,
    maxSensores: 250,
    modulos: [
      ModuloSistema.DASHBOARD,
      ModuloSistema.RECEPCION,
      ModuloSistema.DESTINO_PRODUCTIVO_IA,
      ModuloSistema.MONITOREO_ALERTAS,
      ModuloSistema.SENSORES_IOT,
      ModuloSistema.TRAZABILIDAD,
      ModuloSistema.REPORTES_FORECAST,
      ModuloSistema.ASISTENTE_VOZ,
    ],
  },
};