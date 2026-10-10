import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRolDto } from '../dto/create-rol.dto';

describe('CreateRolDto', () => {
  const dtoValido = {
    nombre: 'Supervisor de calidad',
    descripcion: 'Accede a módulos de calidad y reportes',
    empresaId: 1,
  };

  it('debe aceptar un DTO válido', async () => {
    const dto = plainToInstance(CreateRolDto, dtoValido);

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  describe('nombre', () => {
    it('debe aceptar un nombre no vacío', async () => {
      const dto = plainToInstance(CreateRolDto, dtoValido);

      dto.nombre = 'Administrador';

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar un nombre vacío', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        nombre: '',
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'nombre')).toBe(true);
    });

    it('debe rechazar un nombre que no sea string', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        nombre: 123,
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'nombre')).toBe(true);
    });

    it('debe rechazar nombre ausente', async () => {
      const { nombre, ...datos } = dtoValido;
      const dto = plainToInstance(CreateRolDto, datos);

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'nombre')).toBe(true);
    });
  });

  describe('descripcion', () => {
    it('debe aceptar una descripción válida', async () => {
      const dto = plainToInstance(CreateRolDto, dtoValido);

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    });

    it('debe aceptar una descripción opcional ausente', async () => {
      const { descripcion, ...datos } = dtoValido;
      const dto = plainToInstance(CreateRolDto, datos);

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    });

    it('debe aceptar descripcion como null por IsOptional', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        descripcion: null,
      });

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar una descripción que no sea string', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        descripcion: 123,
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'descripcion')).toBe(true);
    });
  });

  describe('empresaId', () => {
    it('debe aceptar un empresaId entero positivo', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        empresaId: 10,
      });

      const errores = await validate(dto);

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar un empresaId que no sea entero', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        empresaId: 1.5,
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'empresaId')).toBe(true);
    });

    it('debe rechazar un empresaId igual a cero', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        empresaId: 0,
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'empresaId')).toBe(true);
    });

    it('debe rechazar un empresaId negativo', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        empresaId: -1,
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'empresaId')).toBe(true);
    });

    it('debe rechazar un empresaId de tipo string', async () => {
      const dto = plainToInstance(CreateRolDto, {
        ...dtoValido,
        empresaId: '1',
      });

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'empresaId')).toBe(true);
    });

    it('debe rechazar empresaId ausente', async () => {
      const { empresaId, ...datos } = dtoValido;
      const dto = plainToInstance(CreateRolDto, datos);

      const errores = await validate(dto);

      expect(errores.some((e) => e.property === 'empresaId')).toBe(true);
    });
  });
});