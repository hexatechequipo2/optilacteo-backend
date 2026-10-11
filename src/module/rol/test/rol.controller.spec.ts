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
  it('la descripción de auditoría de crear incluye el nombre y los permisos posteriores', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.crear,
    ) as { descripcion: (ctx: unknown) => string };

    const texto = meta.descripcion({
      responseBody: {
        nombre: 'Laboratorio',
        despues: [{ modulo: 'trazabilidad', canRead: true }],
      },
    });

    expect(texto).toContain('Laboratorio');
    expect(texto).toContain('trazabilidad');
  });

  it('la descripción de auditoría de crear usa valores por defecto si faltan datos', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.crear,
    ) as { descripcion: (ctx: unknown) => string };

    const texto = meta.descripcion({});

    expect(texto).toContain('Rol ? creado');
    expect(texto).toContain('undefined');
  });

  it('la descripción de auditoría de asignar incluye el usuario y los roles', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.asignar,
    ) as { descripcion: (ctx: unknown) => string };

    const texto = meta.descripcion({
      responseBody: {
        usuarioId: 9,
        rolAnterior: 'Operador',
        rolNuevo: 'Administrador',
      },
    });

    expect(texto).toContain('Usuario 9');
    expect(texto).toContain('Operador');
    expect(texto).toContain('Administrador');
  });

  it('la descripción de auditoría de asignar contempla un usuario sin rol anterior', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.asignar,
    ) as { descripcion: (ctx: unknown) => string };

    const texto = meta.descripcion({
      responseBody: {
        usuarioId: 9,
        rolNuevo: 'Operador',
      },
    });

    expect(texto).toContain('Usuario 9');
    expect(texto).toContain('sin rol');
    expect(texto).toContain('Operador');
  });

  it('la descripción de auditoría de actualizar incluye el nombre y los permisos', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.actualizar,
    ) as { descripcion: (ctx: unknown) => string };

    const texto = meta.descripcion({
      responseBody: {
        nombre: 'Laboratorio',
        antes: [{ modulo: 'usuarios' }],
        despues: [{ modulo: 'trazabilidad' }],
      },
    });

    expect(texto).toContain('Laboratorio');
    expect(texto).toContain('usuarios');
    expect(texto).toContain('trazabilidad');
  });

  it('la descripción de auditoría de actualizar contempla datos ausentes', () => {
    const meta = Reflect.getMetadata(
      AUDIT_KEY,
      RolController.prototype.actualizar,
    ) as { descripcion: (ctx: unknown) => string };

    const texto = meta.descripcion({});

    expect(texto).toContain('Rol undefined');
    expect(texto).toContain('Antes: undefined');
    expect(texto).toContain('Después: undefined');
  });

});
