import { UserMapper } from '../mappers/user.mapper';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Rol } from '../../rol/entities/rol.entity';

function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return { id: 1, name: 'Lacteos Norte', ...overrides } as Empresa;
}

function buildRol(overrides: Partial<Rol> = {}): Rol {
  return { id: 2, nombre: 'GERENTE', isActive: true, permisos: [], ...overrides } as Rol;
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 10,
    name: 'Juan Pérez',
    email: 'juan@lacteosnorte.com',
    password: 'hash_seguro',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    empresa: buildEmpresa(),
    rol: buildRol(),
    ...overrides,
  } as User;
}

function buildCreateDto(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
  return {
    name: 'Juan Pérez',
    email: 'juan@lacteosnorte.com',
    password: 'plainPassword123',
    rolId: 2,
    empresaId: 1,
    ...overrides,
  };
}

describe('UserMapper', () => {
  describe('toEntity - alta', () => {
    it('deberia mapear nombre, email, la contraseña ya hasheada, y las entidades empresa/rol resueltas', () => {
      const dto = buildCreateDto();
      const empresa = buildEmpresa();
      const rol = buildRol();

      const result = UserMapper.toEntity(dto, empresa, rol, 'hash_generado_por_bcrypt');

      expect(result).toEqual({
        name: 'Juan Pérez',
        email: 'juan@lacteosnorte.com',
        password: 'hash_generado_por_bcrypt',
        empresa,
        rol,
      });
    });

    it('no deberia incluir la contraseña en texto plano del DTO en la entidad resultante', () => {
      const dto = buildCreateDto({ password: 'plainPassword123' });

      const result = UserMapper.toEntity(dto, buildEmpresa(), buildRol(), 'hash_bcrypt');

      expect(result.password).toBe('hash_bcrypt');
      expect(result.password).not.toBe('plainPassword123');
    });
  });

  describe('toResponse', () => {
    it('deberia mapear id, name, email, isActive, y datos de rol/empresa', () => {
      const user = buildUser();

      const result = UserMapper.toResponse(user);

      expect(result).toEqual({
        id: 10,
        name: 'Juan Pérez',
        email: 'juan@lacteosnorte.com',
        isActive: true,
        isLocked: false,
        lockedUntil: null,
        rolId: 2,
        rolNombre: 'GERENTE',
        empresa: { id: 1, name: 'Lacteos Norte' },
      });
    });

    it('nunca deberia incluir el hash de la contraseña en la respuesta', () => {
      const user = buildUser();

      const result = UserMapper.toResponse(user);

      expect(result).not.toHaveProperty('password');
    });

    it('deberia reflejar isActive en false para un usuario desactivado', () => {
      const user = buildUser({ isActive: false });

      const result = UserMapper.toResponse(user);

      expect(result.isActive).toBe(false);
    });

    it('deberia devolver rolId/rolNombre en null cuando el usuario no tiene rol asignado', () => {
      const user = buildUser({ rol: null });

      const result = UserMapper.toResponse(user);

      expect(result.rolId).toBeNull();
      expect(result.rolNombre).toBeNull();
    });

    it('deberia devolver empresa en null cuando el usuario no tiene empresa asignada', () => {
      const user = buildUser({ empresa: null });

      const result = UserMapper.toResponse(user);

      expect(result.empresa).toBeNull();
    });
  });

  describe('toResponseList', () => {
    it('deberia mapear cada usuario de la lista preservando el orden', () => {
      const users = [
        buildUser({ id: 1, name: 'Juan Pérez' }),
        buildUser({ id: 2, name: 'Ana Gómez' }),
      ];

      const result = UserMapper.toResponseList(users);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, name: 'Juan Pérez' });
      expect(result[1]).toMatchObject({ id: 2, name: 'Ana Gómez' });
    });

    it('deberia devolver un array vacio cuando no hay usuarios', () => {
      const result = UserMapper.toResponseList([]);

      expect(result).toEqual([]);
    });
  });
});
