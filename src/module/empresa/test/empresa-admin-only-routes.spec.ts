import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { ROLES } from '../../rol/constants/roles.constants';
import { EmpresaController } from '../empresa.controller';
import { PlanesController } from '../planes.controller';

describe('Metadata de @Roles en endpoints de Empresa/Planes', () => {
  it('EmpresaController no tiene @Roles a nivel de clase (los roles se definen por metodo)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController)).toBeUndefined();
  });

  it('findAll (listado admin de empresas) requiere ROLES.ADMINISTRADOR', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findAll)).toEqual([
      ROLES.ADMINISTRADOR,
    ]);
  });

  it('findOne requiere ROLES.ADMINISTRADOR', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findOne)).toEqual([
      ROLES.ADMINISTRADOR,
    ]);
  });

  // findMine (GET /empresa/me) no lleva @Roles(): cualquier rol autenticado
  // puede ver los datos de su propia empresa (ver EmpresaService.findMine).
  it('findMine (GET /empresa/me) no tiene restriccion de rol -- abierto a cualquier autenticado', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, EmpresaController.prototype.findMine),
    ).toBeUndefined();
  });

  it('GET /planes requiere ROLES.ADMINISTRADOR', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlanesController.prototype.findAll)).toEqual([
      ROLES.ADMINISTRADOR,
    ]);
  });
});
