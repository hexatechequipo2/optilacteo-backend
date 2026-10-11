import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProveedorFilterQueryDto } from '../dto/proveedor-filter-query.dto';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

describe('ProveedorFilterQueryDto', () => {
  const tipoValido = Object.values(TipoProveedor).find(
    (valor) => typeof valor === 'string',
  ) as TipoProveedor;

  const estadoValido = Object.values(EstadoProveedor).find(
    (valor) => typeof valor === 'string',
  ) as EstadoProveedor;

  async function validar(data: Record<string, unknown>) {
    const dto = plainToInstance(ProveedorFilterQueryDto, data);
    return validate(dto);
  }

  describe('campos opcionales', () => {
    it('debería aceptar un objeto vacío', async () => {
      const errores = await validar({});

      expect(errores).toHaveLength(0);
    });

    it('debería aceptar todos los filtros con valores válidos', async () => {
      const errores = await validar({
        razonSocial: 'Lácteos del Valle S.A.',
        cuit: '30-71234567-8',
        telefono: '+54 353 4567890',
        emailContacto: 'compras@lacteos.com',
        provincia: 'Córdoba',
        localidad: 'Villa María',
        tipo: tipoValido,
        estado: estadoValido,
      });

      expect(errores).toHaveLength(0);
    });

    it('debería aceptar los filtros omitidos', async () => {
      const errores = await validar({
        razonSocial: undefined,
        cuit: undefined,
        telefono: undefined,
        emailContacto: undefined,
        provincia: undefined,
        localidad: undefined,
        tipo: undefined,
        estado: undefined,
      });

      expect(errores).toHaveLength(0);
    });

    it('debería aceptar filtros con valor null por ser opcionales', async () => {
      const errores = await validar({
        razonSocial: null,
        cuit: null,
        telefono: null,
        emailContacto: null,
        provincia: null,
        localidad: null,
        tipo: null,
        estado: null,
      });

      expect(errores).toHaveLength(0);
    });
  });

  describe.each([
    'razonSocial',
    'cuit',
    'telefono',
    'emailContacto',
    'provincia',
    'localidad',
  ])('%s', (campo) => {
    it(`debería aceptar un valor string para ${campo}`, async () => {
      const errores = await validar({ [campo]: 'valor de prueba' });

      expect(errores.some((error) => error.property === campo)).toBe(false);
    });

    it(`debería rechazar un valor numérico para ${campo}`, async () => {
      const errores = await validar({ [campo]: 123 });

      expect(errores.some((error) => error.property === campo)).toBe(true);
    });

    it(`debería rechazar un valor booleano para ${campo}`, async () => {
      const errores = await validar({ [campo]: true });

      expect(errores.some((error) => error.property === campo)).toBe(true);
    });

    it(`debería rechazar un array para ${campo}`, async () => {
      const errores = await validar({ [campo]: ['valor'] });

      expect(errores.some((error) => error.property === campo)).toBe(true);
    });
  });

  describe('tipo', () => {
    it('debería aceptar un tipo de proveedor válido', async () => {
      const errores = await validar({ tipo: tipoValido });

      expect(errores.some((error) => error.property === 'tipo')).toBe(false);
    });

    it('debería rechazar un tipo de proveedor inválido', async () => {
      const errores = await validar({ tipo: 'TIPO_INEXISTENTE' });

      expect(errores.some((error) => error.property === 'tipo')).toBe(true);
    });

    it('debería rechazar un tipo numérico que no pertenezca al enum', async () => {
      const errores = await validar({ tipo: 999 });

      expect(errores.some((error) => error.property === 'tipo')).toBe(true);
    });
  });

  describe('estado', () => {
    it('debería aceptar un estado válido', async () => {
      const errores = await validar({ estado: estadoValido });

      expect(errores.some((error) => error.property === 'estado')).toBe(false);
    });

    it('debería rechazar un estado inválido', async () => {
      const errores = await validar({ estado: 'ESTADO_INEXISTENTE' });

      expect(errores.some((error) => error.property === 'estado')).toBe(true);
    });

    it('debería rechazar un estado numérico que no pertenezca al enum', async () => {
      const errores = await validar({ estado: 999 });

      expect(errores.some((error) => error.property === 'estado')).toBe(true);
    });
  });

  describe('herencia de PaginationQueryDto', () => {
    it('debería validar los campos de paginación heredados', async () => {
      const dto = plainToInstance(ProveedorFilterQueryDto, {
        page: 1,
        limit: 10,
      });

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    });
  });
});