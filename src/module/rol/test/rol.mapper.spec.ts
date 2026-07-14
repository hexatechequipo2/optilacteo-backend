import { RolMapper } from '../mappers/rol.mapper';
import { Rol } from '../entities/rol.entity';
import { CreateRolDto } from '../dto/create-rol.dto';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return { id: 1, name: 'Lacteos Norte', ...overrides } as Empresa;
}

function buildRol(overrides: Partial<Rol> = {}): Rol {
  return {
    id: 5,
    nombre: 'Supervisor de calidad',
    descripcion: 'Accede a módulos de calidad y reportes',
    isActive: true,
    empresa: buildEmpresa(),
    permisos: [],
    ...overrides,
  } as Rol;
}

function buildCreateDto(overrides: Partial<CreateRolDto> = {}): CreateRolDto {
  return {
    nombre: 'Supervisor de calidad',
    descripcion: 'Accede a módulos de calidad y reportes',
    empresaId: 1,
    ...overrides,
  };
}

describe('RolMapper', () => {
  describe('toEntity - alta de rol', () => {
    it('deberia mapear nombre, descripcion y la empresa resuelta', () => {
      const dto = buildCreateDto();
      const empresa = buildEmpresa();

      const result = RolMapper.toEntity(dto, empresa);

      expect(result).toEqual({
        nombre: 'Supervisor de calidad',
        descripcion: 'Accede a módulos de calidad y reportes',
        empresa,
      });
    });

    it('deberia dejar descripcion en undefined cuando el DTO no la trae', () => {
      const dto = buildCreateDto({ descripcion: undefined });

      const result = RolMapper.toEntity(dto, buildEmpresa());

      expect(result.descripcion).toBeUndefined();
    });
  });

  describe('toResponse', () => {
    it('deberia mapear id, nombre, descripcion, isActive y empresa', () => {
      const rol = buildRol();

      const result = RolMapper.toResponse(rol);

      expect(result).toEqual({
        id: 5,
        nombre: 'Supervisor de calidad',
        descripcion: 'Accede a módulos de calidad y reportes',
        isActive: true,
        empresa: { id: 1, name: 'Lacteos Norte' },
        permisos: [],
      });
    });

    it('deberia mapear los permisos asignados con su granularidad canRead/canWrite', () => {
      const rol = buildRol({
        permisos: [
          { id: 1, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false, rol: undefined as never },
          { id: 2, modulo: ModuloSistema.RECEPCION, canRead: true, canWrite: true, rol: undefined as never },
        ],
      });

      const result = RolMapper.toResponse(rol);

      expect(result.permisos).toEqual([
        { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false },
        { modulo: ModuloSistema.RECEPCION, canRead: true, canWrite: true },
      ]);
    });

    it('deberia devolver descripcion en null cuando es undefined', () => {
      const rol = buildRol({ descripcion: undefined });

      const result = RolMapper.toResponse(rol);

      expect(result.descripcion).toBeNull();
    });

    it('deberia devolver empresa en null cuando el rol no tiene empresa asignada', () => {
      const rol = buildRol({ empresa: undefined });

      const result = RolMapper.toResponse(rol);

      expect(result.empresa).toBeNull();
    });

    it('deberia devolver permisos como array vacio cuando la relacion no fue cargada (undefined)', () => {
      const rol = buildRol({ permisos: undefined as unknown as Rol['permisos'] });

      const result = RolMapper.toResponse(rol);

      expect(result.permisos).toEqual([]);
    });

    it('deberia reflejar isActive en false para un rol desactivado', () => {
      const rol = buildRol({ isActive: false });

      const result = RolMapper.toResponse(rol);

      expect(result.isActive).toBe(false);
    });
  });

  describe('toResponseList', () => {
    it('deberia mapear cada rol de la lista preservando el orden', () => {
      const roles = [
        buildRol({ id: 1, nombre: 'Gerente' }),
        buildRol({ id: 2, nombre: 'Operario de línea' }),
      ];

      const result = RolMapper.toResponseList(roles);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, nombre: 'Gerente' });
      expect(result[1]).toMatchObject({ id: 2, nombre: 'Operario de línea' });
    });

    it('deberia devolver un array vacio cuando no hay roles', () => {
      const result = RolMapper.toResponseList([]);

      expect(result).toEqual([]);
    });
  });
});
