import {
  AUTHENTICATED_ONLY_KEY,
  PERMISSIONS_KEY,
} from '../../../common/decorators/permissions.decorator';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import { ModuloAdministrativo } from '../../permiso/enums/modulo-administrativo.enum';
import { EmpresaController } from '../empresa.controller';
import { PlanesController } from '../planes.controller';

/* eslint-disable @typescript-eslint/unbound-method */

const permisoDe = (handler: object): unknown =>
  Reflect.getMetadata(PERMISSIONS_KEY, handler);

describe('Metadata de permisos en endpoints de Empresa/Planes (HU-72)', () => {
  it('EmpresaController no tiene permisos a nivel de clase (se definen por metodo)', () => {
    expect(permisoDe(EmpresaController)).toBeUndefined();
  });

  it.each([
    ['create', PermissionAction.CREATE],
    ['findAll', PermissionAction.READ],
    ['findOne', PermissionAction.READ],
    ['update', PermissionAction.UPDATE],
    ['activate', PermissionAction.UPDATE],
    ['deactivate', PermissionAction.UPDATE],
    ['activarModulo', PermissionAction.UPDATE],
    ['desactivarModulo', PermissionAction.UPDATE],
    ['remove', PermissionAction.DELETE],
  ] as const)('%s requiere PLATAFORMA %s', (metodo, action) => {
    expect(permisoDe(EmpresaController.prototype[metodo])).toEqual({
      modulo: ModuloAdministrativo.PLATAFORMA,
      action,
    });
  });

  it.each(['updateIdentidad', 'uploadLogo', 'deleteLogo'] as const)(
    '%s requiere CONFIGURACION_EMPRESA UPDATE',
    (metodo) => {
      expect(permisoDe(EmpresaController.prototype[metodo])).toEqual({
        modulo: ModuloAdministrativo.CONFIGURACION_EMPRESA,
        action: PermissionAction.UPDATE,
      });
    },
  );

  it('findMine (GET /empresa/me) es @AuthenticatedOnly: cualquier autenticado ve su empresa', () => {
    expect(
      Reflect.getMetadata(
        AUTHENTICATED_ONLY_KEY,
        EmpresaController.prototype.findMine,
      ),
    ).toBe(true);
    expect(permisoDe(EmpresaController.prototype.findMine)).toBeUndefined();
  });

  it('GET /planes requiere PLATAFORMA READ', () => {
    expect(permisoDe(PlanesController.prototype.findAll)).toEqual({
      modulo: ModuloAdministrativo.PLATAFORMA,
      action: PermissionAction.READ,
    });
  });
});
