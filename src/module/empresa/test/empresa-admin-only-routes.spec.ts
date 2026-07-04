import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { ROLES } from '../../rol/constants/roles.constants';
import { EmpresaController } from '../empresa.controller';
import { PlanesController } from '../planes.controller';

describe('Metadata de @Roles en endpoints admin-only de Empresa/Planes', () => {
  it('EmpresaController completo requiere ROLES.ADMINISTRADOR (decorador a nivel de clase)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController)).toEqual([
      ROLES.ADMINISTRADOR,
    ]);
  });

  // NOTA: como @Roles está a nivel de clase, todos los métodos heredan la
  // restricción de ADMINISTRADOR en runtime (RolesGuard combina metadata de
  // clase + método). Los siguientes tests solo confirman que NO hay un
  // override de metadata a nivel de método individual — no implican que
  // estas rutas estén abiertas a otros roles.
  it('findMine no tiene un override de rol a nivel de método (hereda de la clase)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findMine)).toBeUndefined();
  });

  it('findOne no tiene un override de rol a nivel de método (hereda de la clase)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findOne)).toBeUndefined();
  });

  it('GET /planes requiere ROLES.ADMINISTRADOR', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlanesController.prototype.findAll)).toEqual([
      ROLES.ADMINISTRADOR,
    ]);
  });
});