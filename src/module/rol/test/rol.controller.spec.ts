/* eslint-disable @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolController } from '../rol.controller';
import type { RolService } from '../rol.service';
import { EmpresaObjetivoGuard } from '../../../common/tenant/empresa-objetivo';
import { AUDIT_KEY } from '../../audit/decorators/audit-log.decorator';
import type { GuardarRolDto } from '../dto/guardar-rol.dto';

/**
 * RolController delega en RolService con la empresa que resolvió
 * EmpresaObjetivoGuard (HU-72, criterio 5): todos sus handlers lo usan.
 */
describe('RolController', () => {
  const service = {
    listar: jest.fn(),
    crear: jest.fn(),
    asignarRol: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
  };
  const controller = new RolController(service as unknown as RolService);
  const actor = { id: 1, rolId: 1, empresaId: null, esSistema: true };
  const dto = { nombre: 'Laboratorio', permisos: [] } as GuardarRolDto;

  beforeEach(() => jest.clearAllMocks());

  it.each(['listar', 'crear', 'asignar', 'actualizar', 'eliminar'] as const)(
    '%s usa EmpresaObjetivoGuard',
    (handler) => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, RolController.prototype[handler]),
      ).toEqual([EmpresaObjetivoGuard]);
    },
  );

  it.each(['crear', 'asignar', 'actualizar', 'eliminar'] as const)(
    '%s queda auditado',
    (handler) => {
      expect(
        Reflect.getMetadata(AUDIT_KEY, RolController.prototype[handler]),
      ).toBeDefined();
    },
  );

  it('listar delega con la empresa resuelta', () => {
    controller.listar(2);
    expect(service.listar).toHaveBeenCalledWith(2);
  });

  it('crear delega con la empresa resuelta y el body', () => {
    controller.crear(2, dto);
    expect(service.crear).toHaveBeenCalledWith(2, dto);
  });

  it('asignar delega usuario, rol, empresa y actor', () => {
    controller.asignar(2, 9, { rolId: 4 }, actor);
    expect(service.asignarRol).toHaveBeenCalledWith(9, 4, 2, actor);
  });

  it('actualizar delega rol, empresa, body y actor', () => {
    controller.actualizar(2, 7, dto, actor);
    expect(service.actualizar).toHaveBeenCalledWith(7, 2, dto, actor);
  });

  it('eliminar delega rol y empresa', () => {
    controller.eliminar(2, 7);
    expect(service.eliminar).toHaveBeenCalledWith(7, 2);
  });

  it('la descripción de auditoría de eliminar incluye los permisos que tenía', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.eliminar,
    ) as { descripcion: (ctx: unknown) => string };
    const texto = meta.descripcion({
      responseBody: {
        nombre: 'Laboratorio',
        antes: [{ modulo: 'trazabilidad', canRead: true }],
      },
    });
    expect(texto).toContain('Laboratorio');
    expect(texto).toContain('trazabilidad');
  });
});
