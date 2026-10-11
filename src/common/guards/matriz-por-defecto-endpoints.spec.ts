import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermisoService } from '../../module/permiso/permiso.service';
import type { PermisoModulo } from '../../module/permiso/entities/permiso-modulo.entity';
import {
  filasPermisosPorDefecto,
  type RolCatalogo,
} from '../../module/permiso/constants/permisos-por-defecto.constant';
import { ROLES } from '../../module/rol/constants/roles.constants';
import { LoteController } from '../../module/lote/lote.controller';
import { ProveedoresController } from '../../module/proveedores/proveedor.controller';
import { TamboController } from '../../module/tambo/tambo.controller';
import { MedicionManualController } from '../../module/medicion-manual/medicion-manual.controller';
import { LecturaSensorController } from '../../module/lectura-sensor/lectura-sensor.controller';
import { SensorController } from '../../module/sensor/sensor.controller';
import { PlcConfigController } from '../../module/plc-config/plc-config.controller';
import { ConfigParametroController } from '../../module/config-parametro/config-parametro.controller';
import { ConfiguracionComparacionHistoricaController } from '../../module/config-parametro/configuracion-comparacion-historica.controller';
import { RetencionController } from '../../module/retencion/retencion.controller';
import { NotificacionesController } from '../../module/notificaciones/notificaciones.controller';
import { DestinoProductivoController } from '../../module/destino-productivo/destino-productivo.controller';
import { IngresoCamaraController } from '../../module/lote/ingreso-camara.controller';
import { AuditLogController } from '../../module/audit/audit-log.controller';
import { RolController } from '../../module/rol/rol.controller';
import { UserController } from '../../module/user/user.controller';
import { EmpresaController } from '../../module/empresa/empresa.controller';

/* eslint-disable @typescript-eslint/unbound-method */

/**
 * HU-72: con la matriz por defecto y los decoradores reales, cada rol de
 * catálogo accede exactamente a lo decidido (incluidas las re-decoraciones de
 * configuración, mediciones manuales, plc-config y horarios de silencio).
 */

const {
  GERENTE: G,
  OPERARIO_LINEA: O,
  RESPONSABLE_PRODUCCION: P,
  RESPONSABLE_CALIDAD: C,
} = ROLES;
const TODOS: RolCatalogo[] = [G, O, P, C];

const lote = LoteController.prototype;
const sensor = SensorController.prototype;
const plc = PlcConfigController.prototype;
const cfg = ConfigParametroController.prototype;
const comp = ConfiguracionComparacionHistoricaController.prototype;
const ret = RetencionController.prototype;
const notif = NotificacionesController.prototype;

// [endpoint, handler, roles que pasan]; el resto recibe 403.
const CASOS: [string, object, RolCatalogo[]][] = [
  // Lotes y recepción
  ['POST /lotes', lote.create, [G, C]],
  ['GET /lotes', lote.findAll, TODOS],
  ['PATCH /lotes/:id', lote.update, [G, P, C]],
  ['PATCH /lotes/:id/finalizar', lote.finalizar, [G, P, C]],
  ['POST /lotes/:id/revision', lote.revisar, [G, P, C]],
  ['POST /proveedores', ProveedoresController.prototype.create, [G, C]],
  ['PATCH /proveedores/:id', ProveedoresController.prototype.update, [G]],
  ['POST /tambos', TamboController.prototype.create, [G, P, C]],
  [
    'POST /ingresos-camara',
    IngresoCamaraController.prototype.create,
    [G, P, C],
  ],
  [
    'POST /destinos-productivos',
    DestinoProductivoController.prototype.create,
    [G, P],
  ],

  // Mediciones manuales → monitoreo_alertas:C
  [
    'POST /lotes/:id/mediciones-manuales',
    MedicionManualController.prototype.registrar,
    [O],
  ],
  [
    'POST /sensores/lecturas/manual',
    LecturaSensorController.prototype.ingresarManual,
    [O],
  ],

  // Sensores (HU-33) y plc-config (upsert → C)
  ['GET /sensores', sensor.findAll, TODOS],
  ['POST /sensores', sensor.create, [G, P]],
  ['PATCH /sensores/:id', sensor.update, [G, O, P]],
  ['PATCH /sensores/lote/:loteId/asociar', sensor.asociarALote, [G, O, P]],
  ['PATCH /sensores/:id/activar', sensor.activar, [G, O, P]],
  ['DELETE /sensores/:id', sensor.remove, [G, P]],
  ['GET /plc-config', plc.obtenerConfig, TODOS],
  ['PUT /plc-config', plc.guardarUrl, [G, P]],
  ['POST /plc-config/test-connection', plc.testConexion, [G, P]],

  // Configuración → configuracion_empresa
  ['GET /config-parametros', cfg.listar, TODOS],
  ['POST /config-parametros', cfg.crear, [G]],
  ['PUT /config-parametros/:id', cfg.editar, [G]],
  ['DELETE /config-parametros/:id', cfg.eliminar, [G]],
  ['GET /config-parametros/comparacion-historica', comp.get, [G, P, C]],
  ['PATCH /config-parametros/comparacion-historica', comp.update, [G]],
  ['GET /retencion/politica', ret.getPolitica, [G, P, C]],
  ['PATCH /retencion/politica', ret.updatePolitica, [G]],
  ['GET /notificaciones/configuracion', notif.listarConfiguracion, [G, P, C]],
  ['POST /notificaciones/configuracion', notif.crearConfiguracion, [G]],
  [
    'DELETE /notificaciones/configuracion/:id',
    notif.eliminarConfiguracion,
    [G],
  ],
  [
    'PATCH /notificaciones/configuracion-alerta-desconexion',
    notif.actualizarConfiguracionAlertaDesconexion,
    [G],
  ],

  // Alertas (HU-30): horarios de silencio con monitoreo_alertas:U
  [
    'GET /notificaciones/horarios-silencio',
    notif.listarHorariosSilencio,
    TODOS,
  ],
  [
    'POST /notificaciones/horarios-silencio',
    notif.crearHorarioSilencio,
    [G, P],
  ],
  [
    'PATCH /notificaciones/horarios-silencio/:id',
    notif.actualizarHorarioSilencio,
    [G, P],
  ],
  [
    'DELETE /notificaciones/horarios-silencio/:id',
    notif.eliminarHorarioSilencio,
    [G, P],
  ],
  ['PATCH /notificaciones/:id/resolver', notif.resolverAlerta, [G, P]],
  [
    'PATCH /notificaciones/:id/falso-positivo',
    notif.marcarFalsoPositivo,
    [G, P],
  ],

  // Administrativos
  ['GET /audit-log', AuditLogController.prototype.findAll, [G]],
  ['GET /audit-log/export', AuditLogController.prototype.export, [G]],
  ['POST /roles', RolController.prototype.crear, [G]],
  ['GET /user', UserController.prototype.findAll, [G, C]],
  ['POST /user', UserController.prototype.create, [G]],
  [
    'PATCH /empresa/me/identidad',
    EmpresaController.prototype.updateIdentidad,
    [G],
  ],
  ['GET /empresa (plataforma)', EmpresaController.prototype.findAll, []],
];

const permisosDe = (rol: RolCatalogo) =>
  filasPermisosPorDefecto()
    .filter((f) => f.rol === rol)
    .map((f) => ({ ...f, rol: undefined }) as unknown as PermisoModulo);

describe('Matriz por defecto × endpoints reales, por rol de catálogo (HU-72)', () => {
  let guard: PermissionsGuard;
  let rolActual: RolCatalogo;

  beforeAll(() => {
    const permisoService = new PermisoService(
      {} as never,
      {} as never,
      {} as never,
    );
    jest.spyOn(permisoService, 'obtenerAcceso').mockImplementation(() =>
      Promise.resolve({
        userId: 1,
        rolId: 1,
        rolNombre: rolActual,
        empresaId: 1,
        esSistema: false,
        permisos: permisosDe(rolActual),
      }),
    );
    guard = new PermissionsGuard(new Reflector(), permisoService);
  });

  const pasa = (handler: object) =>
    guard.canActivate({
      getHandler: () => handler,
      getClass: () => Object,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 1 } }) }),
    } as unknown as ExecutionContext);

  describe.each(TODOS)('%s', (rol) => {
    beforeEach(() => {
      rolActual = rol;
    });

    it.each(CASOS)('%s', async (_endpoint, handler, permitidos) => {
      if (permitidos.includes(rol)) {
        await expect(pasa(handler)).resolves.toBe(true);
      } else {
        await expect(pasa(handler)).rejects.toThrow(ForbiddenException);
      }
    });
  });
});
