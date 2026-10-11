import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

describe('CreateProveedorDto', () => {
  const tipoValido = Object.values(TipoProveedor).find(
    (valor) => typeof valor === 'string',
  ) as TipoProveedor;

  const estadoValido = Object.values(EstadoProveedor).find(
    (valor) => typeof valor === 'string',
  ) as EstadoProveedor;

  const dtoValido = {
    razonSocial: 'Lácteos del Valle S.A.',
    cuit: '30-71234567-8',
    tipo: tipoValido,
  };

  async function validar(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateProveedorDto, data);
    return validate(dto);
  }

  describe('razonSocial', () => {
    it('debería aceptar una razón social válida', async () => {
      const errores = await validar(dtoValido);
      expect(errores).toHaveLength(0);
    });

    it('debería rechazar una razón social vacía', async () => {
      const errores = await validar({
        ...dtoValido,
        razonSocial: '',
      });

      expect(errores.some((e) => e.property === 'razonSocial')).toBe(true);
    });

    it('debería rechazar una razón social ausente', async () => {
      const { razonSocial, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'razonSocial')).toBe(true);
    });

    it('debería rechazar una razón social que no sea string', async () => {
      const errores = await validar({
        ...dtoValido,
        razonSocial: 123,
      });

      expect(errores.some((e) => e.property === 'razonSocial')).toBe(true);
    });

    it('debería rechazar una razón social de más de 200 caracteres', async () => {
      const errores = await validar({
        ...dtoValido,
        razonSocial: 'A'.repeat(201),
      });

      expect(errores.some((e) => e.property === 'razonSocial')).toBe(true);
    });

    it('debería aceptar una razón social de exactamente 200 caracteres', async () => {
      const errores = await validar({
        ...dtoValido,
        razonSocial: 'A'.repeat(200),
      });

      expect(errores.some((e) => e.property === 'razonSocial')).toBe(false);
    });
  });

  describe('cuit', () => {
    it('debería aceptar un CUIT con formato válido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'cuit')).toBe(false);
    });

    it.each([
      '',
      '30712345678',
      '30-7123456-8',
      '30-71234567-88',
      'AB-71234567-8',
      '30/71234567/8',
    ])('debería rechazar el CUIT inválido "%s"', async (cuit) => {
      const errores = await validar({
        ...dtoValido,
        cuit,
      });

      expect(errores.some((e) => e.property === 'cuit')).toBe(true);
    });

    it('debería rechazar un CUIT ausente', async () => {
      const { cuit, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'cuit')).toBe(true);
    });
  });

  describe('telefono', () => {
    it('debería aceptar un teléfono válido', async () => {
      const errores = await validar({
        ...dtoValido,
        telefono: '+54 353 4567890',
      });

      expect(errores.some((e) => e.property === 'telefono')).toBe(false);
    });

    it('debería aceptar el teléfono omitido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'telefono')).toBe(false);
    });

    it('debería aceptar teléfono null por ser opcional', async () => {
      const errores = await validar({
        ...dtoValido,
        telefono: null,
      });

      expect(errores.some((e) => e.property === 'telefono')).toBe(false);
    });

    it('debería rechazar un teléfono que no sea string', async () => {
      const errores = await validar({
        ...dtoValido,
        telefono: 123456,
      });

      expect(errores.some((e) => e.property === 'telefono')).toBe(true);
    });

    it('debería rechazar un teléfono de más de 20 caracteres', async () => {
      const errores = await validar({
        ...dtoValido,
        telefono: '1'.repeat(21),
      });

      expect(errores.some((e) => e.property === 'telefono')).toBe(true);
    });
  });

  describe('emailContacto', () => {
    it('debería aceptar un email válido', async () => {
      const errores = await validar({
        ...dtoValido,
        emailContacto: 'compras@lacteosdelvalle.com',
      });

      expect(errores.some((e) => e.property === 'emailContacto')).toBe(false);
    });

    it('debería aceptar email null por ser opcional', async () => {
      const errores = await validar({
        ...dtoValido,
        emailContacto: null,
      });

      expect(errores.some((e) => e.property === 'emailContacto')).toBe(false);
    });

    it('debería rechazar un email inválido', async () => {
      const errores = await validar({
        ...dtoValido,
        emailContacto: 'correo-invalido',
      });

      expect(errores.some((e) => e.property === 'emailContacto')).toBe(true);
    });

    it('debería rechazar un email de más de 150 caracteres', async () => {
      const errores = await validar({
        ...dtoValido,
        emailContacto: `${'a'.repeat(140)}@test.com`,
      });

      expect(errores.some((e) => e.property === 'emailContacto')).toBe(true);
    });
  });

  describe('tipo', () => {
    it('debería aceptar un tipo de proveedor válido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'tipo')).toBe(false);
    });

    it('debería rechazar un tipo de proveedor inválido', async () => {
      const errores = await validar({
        ...dtoValido,
        tipo: 'TIPO_INEXISTENTE',
      });

      expect(errores.some((e) => e.property === 'tipo')).toBe(true);
    });

    it('debería rechazar un tipo de proveedor ausente', async () => {
      const { tipo, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'tipo')).toBe(true);
    });
  });

  describe('empresaId', () => {
    it('debería aceptar un empresaId numérico', async () => {
      const errores = await validar({
        ...dtoValido,
        empresaId: 2,
      });

      expect(errores.some((e) => e.property === 'empresaId')).toBe(false);
    });

    it('debería aceptar empresaId omitido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'empresaId')).toBe(false);
    });

    it('debería rechazar un empresaId que no sea número', async () => {
      const errores = await validar({
        ...dtoValido,
        empresaId: '2',
      });

      expect(errores.some((e) => e.property === 'empresaId')).toBe(true);
    });
  });

  describe('provincia y localidad', () => {
    it.each(['provincia', 'localidad'])(
      'debería aceptar %s como string válido',
      async (propiedad) => {
        const errores = await validar({
          ...dtoValido,
          [propiedad]: 'Córdoba',
        });

        expect(errores.some((e) => e.property === propiedad)).toBe(false);
      },
    );

    it.each(['provincia', 'localidad'])(
      'debería aceptar %s null por ser opcional',
      async (propiedad) => {
        const errores = await validar({
          ...dtoValido,
          [propiedad]: null,
        });

        expect(errores.some((e) => e.property === propiedad)).toBe(false);
      },
    );

    it.each(['provincia', 'localidad'])(
      'debería rechazar %s si no es string',
      async (propiedad) => {
        const errores = await validar({
          ...dtoValido,
          [propiedad]: 123,
        });

        expect(errores.some((e) => e.property === propiedad)).toBe(true);
      },
    );

    it.each(['provincia', 'localidad'])(
      'debería rechazar %s de más de 100 caracteres',
      async (propiedad) => {
        const errores = await validar({
          ...dtoValido,
          [propiedad]: 'A'.repeat(101),
        });

        expect(errores.some((e) => e.property === propiedad)).toBe(true);
      },
    );
  });

  describe('capacidad', () => {
    it('debería aceptar una capacidad positiva', async () => {
      const errores = await validar({
        ...dtoValido,
        capacidad: 500,
      });

      expect(errores.some((e) => e.property === 'capacidad')).toBe(false);
    });

    it('debería aceptar una capacidad igual a cero', async () => {
      const errores = await validar({
        ...dtoValido,
        capacidad: 0,
      });

      expect(errores.some((e) => e.property === 'capacidad')).toBe(false);
    });

    it('debería aceptar capacidad omitida', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'capacidad')).toBe(false);
    });

    it('debería rechazar una capacidad negativa', async () => {
      const errores = await validar({
        ...dtoValido,
        capacidad: -1,
      });

      expect(errores.some((e) => e.property === 'capacidad')).toBe(true);
    });

    it('debería rechazar una capacidad que no sea número', async () => {
      const errores = await validar({
        ...dtoValido,
        capacidad: '500',
      });

      expect(errores.some((e) => e.property === 'capacidad')).toBe(true);
    });
  });

  describe('estado', () => {
    it('debería aceptar un estado válido', async () => {
      const errores = await validar({
        ...dtoValido,
        estado: estadoValido,
      });

      expect(errores.some((e) => e.property === 'estado')).toBe(false);
    });

    it('debería aceptar estado omitido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'estado')).toBe(false);
    });

    it('debería rechazar un estado inválido', async () => {
      const errores = await validar({
        ...dtoValido,
        estado: 'ESTADO_INEXISTENTE',
      });

      expect(errores.some((e) => e.property === 'estado')).toBe(true);
    });
  });
});
