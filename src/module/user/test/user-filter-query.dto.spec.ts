import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserFilterQueryDto } from '../dto/user-filter-query.dto';

describe('UserFilterQueryDto', () => {
  it('debe aceptar una consulta sin filtros opcionales', async () => {
    const dto = plainToInstance(UserFilterQueryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe aceptar name y email como strings', async () => {
    const dto = plainToInstance(UserFilterQueryDto, {
      name: 'Juan Pérez',
      email: 'juan@example.com',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Juan Pérez');
    expect(dto.email).toBe('juan@example.com');
  });

  it('debe rechazar name y email si no son strings', async () => {
    const dto = plainToInstance(UserFilterQueryDto, {
      name: 123,
      email: false,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  describe('isActive', () => {
    it.each([
      ['true', true],
      [true, true],
      ['false', false],
      [false, false],
      ['otro valor', false],
      ['', false],
    ])('debe transformar %s a %s', async (entrada, esperado) => {
      const dto = plainToInstance(UserFilterQueryDto, {
        isActive: entrada,
      });

      expect(dto.isActive).toBe(esperado);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('debe permitir omitir isActive', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {});

      expect(dto.isActive).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('rolId', () => {
    it('debe convertir un string numérico a entero', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {
        rolId: '3',
      });

      expect(dto.rolId).toBe(3);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('debe rechazar un rolId que no sea entero', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {
        rolId: '2.5',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'rolId')).toBe(true);
    });

    it('debe permitir omitir rolId', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {});

      expect(dto.rolId).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('empresaId', () => {
    it('debe convertir un string numérico a entero', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {
        empresaId: '10',
      });

      expect(dto.empresaId).toBe(10);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('debe rechazar un empresaId que no sea entero', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {
        empresaId: '1.7',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'empresaId')).toBe(true);
    });

    it('debe permitir omitir empresaId', async () => {
      const dto = plainToInstance(UserFilterQueryDto, {});

      expect(dto.empresaId).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  it('debe transformar y validar todos los filtros juntos', async () => {
    const dto = plainToInstance(UserFilterQueryDto, {
      name: 'Ana',
      email: 'ana@example.com',
      isActive: 'true',
      rolId: '2',
      empresaId: '8',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Ana');
    expect(dto.email).toBe('ana@example.com');
    expect(dto.isActive).toBe(true);
    expect(dto.rolId).toBe(2);
    expect(dto.empresaId).toBe(8);
  });
});