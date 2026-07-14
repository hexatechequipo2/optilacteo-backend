import { EmpresaMapper } from '../mappers/empresa.mapper';
import { Empresa } from '../entities/empresa.entity';
import { CreateEmpresaDto } from '../dto/create-empresa.dto';
import { Plan } from '../enums/plan.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';

function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 1,
    name: 'Lacteos Norte',
    cuit: '30-12345678-9',
    email: 'contacto@lacteosnorte.com',
    telefono: '+54 351 1234567',
    direccion: 'Av. Siempreviva 742, Córdoba',
    plan: Plan.PRO,
    isActive: true,
    users: [],
    modulos: [],
    proveedores: [],
    ...overrides,
  } as Empresa;
}

describe('EmpresaMapper', () => {
  describe('toResponse - datos completos', () => {
    it('deberia mapear todos los campos y calcular cantidadUsuarios/modulos a partir de las relaciones', () => {
      // Arrange
      const empresa = buildEmpresa({
        users: [{ id: 1 }, { id: 2 }, { id: 3 }] as Empresa['users'],
        modulos: [
          { id: 1, modulo: ModuloSistema.DASHBOARD, isActive: true, empresa: undefined as never },
          { id: 2, modulo: ModuloSistema.RECEPCION, isActive: false, empresa: undefined as never },
        ],
      });

      // Act
      const result = EmpresaMapper.toResponse(empresa);

      // Assert
      expect(result).toEqual({
        id: 1,
        name: 'Lacteos Norte',
        cuit: '30-12345678-9',
        email: 'contacto@lacteosnorte.com',
        telefono: '+54 351 1234567',
        direccion: 'Av. Siempreviva 742, Córdoba',
        plan: Plan.PRO,
        isActive: true,
        cantidadUsuarios: 3,
        modulos: [
          { modulo: ModuloSistema.DASHBOARD, isActive: true },
          { modulo: ModuloSistema.RECEPCION, isActive: false },
        ],
      });
    });

    it('no deberia filtrar campos extra de EmpresaModulo (solo expone modulo/isActive)', () => {
      // Arrange
      const empresa = buildEmpresa({
        modulos: [
          { id: 99, modulo: ModuloSistema.SENSORES_IOT, isActive: true, empresa: undefined as never },
        ],
      });

      // Act
      const result = EmpresaMapper.toResponse(empresa);

      // Assert
      expect(result.modulos[0]).toEqual({ modulo: ModuloSistema.SENSORES_IOT, isActive: true });
      expect(result.modulos[0]).not.toHaveProperty('id');
    });
  });

  describe('toResponse - relaciones vacias/nulas', () => {
    it('deberia devolver cantidadUsuarios=0 cuando modulos/users son arrays vacios', () => {
      // Arrange
      const empresa = buildEmpresa({ users: [], modulos: [] });

      // Act
      const result = EmpresaMapper.toResponse(empresa);

      // Assert
      expect(result.cantidadUsuarios).toBe(0);
      expect(result.modulos).toEqual([]);
    });

    it('deberia devolver cantidadUsuarios=0 y modulos=[] cuando las relaciones no fueron cargadas (undefined)', () => {
      // Arrange
      const empresa = buildEmpresa({
        users: undefined as unknown as Empresa['users'],
        modulos: undefined as unknown as Empresa['modulos'],
      });

      // Act
      const result = EmpresaMapper.toResponse(empresa);

      // Assert
      expect(result.cantidadUsuarios).toBe(0);
      expect(result.modulos).toEqual([]);
    });

    it('deberia mapear cuit/email/telefono/direccion a null cuando son undefined', () => {
      // Arrange
      const empresa = buildEmpresa({
        cuit: undefined,
        email: undefined,
        telefono: undefined,
        direccion: undefined,
      });

      // Act
      const result = EmpresaMapper.toResponse(empresa);

      // Assert
      expect(result.cuit).toBeNull();
      expect(result.email).toBeNull();
      expect(result.telefono).toBeNull();
      expect(result.direccion).toBeNull();
    });

    it('deberia reflejar isActive en false para una empresa desactivada', () => {
      // Arrange
      const empresa = buildEmpresa({ isActive: false });

      // Act
      const result = EmpresaMapper.toResponse(empresa);

      // Assert
      expect(result.isActive).toBe(false);
    });
  });

  describe('toResponseList', () => {
    it('deberia mapear cada empresa de la lista preservando el orden', () => {
      // Arrange
      const empresas = [
        buildEmpresa({ id: 1, name: 'Lacteos Norte' }),
        buildEmpresa({ id: 2, name: 'Lacteos Sur' }),
      ];

      // Act
      const result = EmpresaMapper.toResponseList(empresas);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, name: 'Lacteos Norte' });
      expect(result[1]).toMatchObject({ id: 2, name: 'Lacteos Sur' });
    });

    it('deberia devolver un array vacio cuando no hay empresas', () => {
      // Arrange & Act
      const result = EmpresaMapper.toResponseList([]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('toEntity', () => {
    it('deberia mapear el DTO de creacion a un Partial<Empresa> con los mismos valores', () => {
      // Arrange
      const dto: CreateEmpresaDto = {
        name: 'Lacteos Norte',
        cuit: '30-12345678-9',
        email: 'contacto@lacteosnorte.com',
        telefono: '+54 351 1234567',
        direccion: 'Av. Siempreviva 742, Córdoba',
        plan: Plan.ENTERPRISE,
      };

      // Act
      const result = EmpresaMapper.toEntity(dto);

      // Assert
      expect(result).toEqual({
        name: 'Lacteos Norte',
        cuit: '30-12345678-9',
        email: 'contacto@lacteosnorte.com',
        telefono: '+54 351 1234567',
        direccion: 'Av. Siempreviva 742, Córdoba',
        plan: Plan.ENTERPRISE,
      });
    });

    it('deberia dejar los campos opcionales en undefined cuando el DTO no los trae', () => {
      // Arrange
      const dto = new CreateEmpresaDto();
      dto.name = 'Empresa Minima';

      // Act
      const result = EmpresaMapper.toEntity(dto);

      // Assert
      expect(result.cuit).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.telefono).toBeUndefined();
      expect(result.direccion).toBeUndefined();
      expect(result.plan).toBe(Plan.STARTER);
    });
  });
});
