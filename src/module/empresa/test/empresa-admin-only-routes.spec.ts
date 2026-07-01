import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { Role } from '../../user/enums/role.enum';
import { EmpresaController } from '../empresa.controller';
import { PlanesController } from '../planes.controller';

describe('Metadata de @Roles en endpoints admin-only de Empresa/Planes', () => {
  it('POST /empresa requiere Role.ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.create)).toEqual([
      Role.ADMIN,
    ]);
  });

  it('GET /empresa requiere Role.ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findAll)).toEqual([
      Role.ADMIN,
    ]);
  });

  it('GET /empresa/me no requiere ningun rol especifico', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findMine)).toBeUndefined();
  });

  it('GET /empresa/:id no requiere ningun rol especifico (el aislamiento lo hace assertOwnEmpresa)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findOne)).toBeUndefined();
  });

  it('GET /planes requiere Role.ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlanesController.prototype.findAll)).toEqual([
      Role.ADMIN,
    ]);
  });
});
