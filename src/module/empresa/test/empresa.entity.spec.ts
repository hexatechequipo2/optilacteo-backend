import { getMetadataArgsStorage } from 'typeorm';
import { Empresa } from '../entities/empresa.entity';
import { Plan } from '../enums/plan.enum';
import { User } from '../../user/entities/user.entity';
import { EmpresaModulo } from '../entities/empresa-modulo.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { Sensor } from '../../sensor/entities/sensor.entity';

describe('Empresa Entity', () => {
  const metadata = getMetadataArgsStorage();

  const obtenerColumna = (nombre: string) =>
    metadata.columns.find(
      (columna) =>
        columna.target === Empresa &&
        columna.propertyName === nombre,
    );

  const obtenerRelacion = (nombre: string) =>
    metadata.relations.find(
      (relacion) =>
        relacion.target === Empresa &&
        relacion.propertyName === nombre,
    );

  describe('definición de entidad', () => {
    it('debe estar definida y permitir crear una instancia', () => {
      expect(Empresa).toBeDefined();
      expect(new Empresa()).toBeInstanceOf(Empresa);
    });

    it('debe mapearse a la tabla empresas', () => {
      const tabla = metadata.tables.find(
        (item) => item.target === Empresa,
      );

      expect(tabla).toBeDefined();
      expect(tabla?.name).toBe('empresas');
    });
  });

  describe('columnas', () => {
    it('debe definir id como clave primaria generada', () => {
      const columnaId = obtenerColumna('id');
      const generacionId = metadata.generations.find(
        (item) =>
          item.target === Empresa &&
          item.propertyName === 'id',
      );
      const clavePrimaria = metadata
        .filterColumns(Empresa)
        .filter((columna) => columna.options.primary);

      expect(columnaId).toBeDefined();
      expect(generacionId).toBeDefined();
      expect(clavePrimaria.map((columna) => columna.propertyName))
        .toContain('id');
    });

    it.each(['name', 'cuit'])(
      'debe definir %s como columna única',
      (campo) => {
        const columna = obtenerColumna(campo);

        expect(columna).toBeDefined();
        expect(columna?.options.unique).toBe(true);
      },
    );

    it.each(['email', 'telefono', 'direccion', 'logoPath'])(
      'debe permitir valores null en %s',
      (campo) => {
        expect(obtenerColumna(campo)?.options.nullable).toBe(true);
      },
    );

    it('debe configurar plan como enum con valor por defecto STARTER', () => {
      const columna = obtenerColumna('plan');

      expect(columna?.options.type).toBe('enum');
      expect(columna?.options.enum).toBe(Plan);
      expect(columna?.options.default).toBe(Plan.STARTER);
    });

    it('debe configurar isActive con valor por defecto true', () => {
      expect(obtenerColumna('isActive')?.options.default).toBe(true);
    });

    it('debe configurar logoPath como varchar nullable', () => {
      const columna = obtenerColumna('logoPath');

      expect(columna?.options.type).toBe('varchar');
      expect(columna?.options.nullable).toBe(true);
    });
  });

describe('relaciones', () => {
  it.each([
    'users',
    'modulos',
    'proveedores',
    'configuracionParametros',
    'lotes',
    'sensores',
  ])('debe definir la relación OneToMany %s', (campo) => {
    const relacion = obtenerRelacion(campo);

    expect(relacion).toBeDefined();
    expect(relacion?.relationType).toBe('one-to-many');
    expect(typeof relacion?.type).toBe('function');
    expect(typeof relacion?.inverseSideProperty).toBe('function');
  });
});


  describe('instancia', () => {
    it('debe permitir asignar sus propiedades', () => {
      const fecha = new Date();
      const empresa = Object.assign(new Empresa(), {
        id: 1,
        name: 'Empresa de prueba',
        cuit: '30-12345678-9',
        email: 'contacto@empresa.com',
        telefono: '3511234567',
        direccion: 'Córdoba',
        plan: Plan.STARTER,
        isActive: true,
        logoPath: '/uploads/logo.png',
        users: [],
        modulos: [],
        proveedores: [],
        configuracionParametros: [],
        lotes: [],
        sensores: [],
      });

      expect(empresa).toMatchObject({
        id: 1,
        name: 'Empresa de prueba',
        cuit: '30-12345678-9',
        email: 'contacto@empresa.com',
        telefono: '3511234567',
        direccion: 'Córdoba',
        plan: Plan.STARTER,
        isActive: true,
        logoPath: '/uploads/logo.png',
        users: [],
        modulos: [],
        proveedores: [],
        configuracionParametros: [],
        lotes: [],
        sensores: [],
      });
    });

    it('debe permitir logoPath null', () => {
      const empresa = Object.assign(new Empresa(), {
        logoPath: null,
      });

      expect(empresa.logoPath).toBeNull();
    });
  });
});