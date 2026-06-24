import { Plan } from '../enums/plan.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';

export const MODULOS_POR_PLAN: Record<Plan, ModuloSistema[]> = {
  [Plan.STARTER]: [ModuloSistema.USUARIOS, ModuloSistema.REPORTES],
  [Plan.PRO]: [
    ModuloSistema.USUARIOS,
    ModuloSistema.REPORTES,
    ModuloSistema.INVENTARIO,
    ModuloSistema.PRODUCCION,
  ],
  [Plan.ENTERPRISE]: [
    ModuloSistema.USUARIOS,
    ModuloSistema.REPORTES,
    ModuloSistema.INVENTARIO,
    ModuloSistema.PRODUCCION,
    ModuloSistema.CALIDAD,
  ],
};