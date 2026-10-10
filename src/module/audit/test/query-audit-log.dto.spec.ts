
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';
import { TipoAccion } from '../enums/tipo-accion.enum';

describe('QueryAuditLogDto', () => {
  async function validar(data: Record<string, unknown>) {
    const dto = plainToInstance(QueryAuditLogDto, data);
    return validate(dto);
  }

  it('acepta un DTO vacío porque todos los campos son opcionales', async () => {
    expect(await validar({})).toHaveLength(0);
  });

  describe('userId', () => {
    it('transforma un string numérico a entero', async () => {
      expect(await validar({ userId: '12' })).toHaveLength(0);
    });

    it('rechaza un valor decimal', async () => {
      const errors = await validar({ userId: '1.5' });
      expect(errors.some((e) => e.property === 'userId')).toBe(true);
    });

    it('rechaza texto no numérico', async () => {
      const errors = await validar({ userId: 'abc' });
      expect(errors.some((e) => e.property === 'userId')).toBe(true);
    });
  });

  describe('accion y estado', () => {
    it('acepta una acción como string', async () => {
      expect(await validar({ accion: 'PROVEEDOR_ELIMINAR' })).toHaveLength(0);
    });

    it.each(['SUCCESS', 'FAILURE'])(
      'acepta el estado %s',
      async (estado) => {
        expect(await validar({ estado })).toHaveLength(0);
      },
    );

    it('rechaza un estado no permitido', async () => {
      const errors = await validar({ estado: 'PENDING' });
      expect(errors.some((e) => e.property === 'estado')).toBe(true);
    });

    it('rechaza una acción que no sea string', async () => {
      const errors = await validar({ accion: 123 });
      expect(errors.some((e) => e.property === 'accion')).toBe(true);
    });
  });

  describe('tipo', () => {
    it('acepta un valor definido en TipoAccion', async () => {
      const tipoValido = Object.values(TipoAccion)[0];

      expect(await validar({ tipo: tipoValido })).toHaveLength(0);
    });

    it('rechaza un tipo desconocido', async () => {
      const errors = await validar({ tipo: '__TIPO_INVALIDO__' });
      expect(errors.some((e) => e.property === 'tipo')).toBe(true);
    });
  });

  describe('fechas', () => {
    it.each(['2026-01-15T10:30:00.000Z', '2026-01-15'])(
      'acepta la fecha ISO %s',
      async (fecha) => {
        expect(await validar({ fechaDesde: fecha })).toHaveLength(0);
      },
    );

    it('rechaza una fecha desde inválida', async () => {
      const errors = await validar({ fechaDesde: 'no-es-una-fecha' });
      expect(errors.some((e) => e.property === 'fechaDesde')).toBe(true);
    });

    it('rechaza una fecha hasta inválida', async () => {
      const errors = await validar({ fechaHasta: '31/12/2026' });
      expect(errors.some((e) => e.property === 'fechaHasta')).toBe(true);
    });
  });

  describe('paginación', () => {
    it('transforma page y limit desde strings numéricos', async () => {
      const dto = plainToInstance(QueryAuditLogDto, {
        page: '2',
        limit: '25',
      });

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(25);
    });

    it('rechaza page igual a cero', async () => {
      const errors = await validar({ page: '0' });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('rechaza limit negativo', async () => {
      const errors = await validar({ limit: '-5' });
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('rechaza valores decimales', async () => {
      const errors = await validar({ page: '1.5', limit: '2.5' });

      expect(errors.some((e) => e.property === 'page')).toBe(true);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });
  });

  it('acepta filtros combinados válidos', async () => {
    const tipoValido = Object.values(TipoAccion)[0];

    const errors = await validar({
      userId: '12',
      accion: 'PROVEEDOR_ELIMINAR',
      estado: 'FAILURE',
      tipo: tipoValido,
      fechaDesde: '2026-01-01T00:00:00.000Z',
      fechaHasta: '2026-01-31T23:59:59.000Z',
      page: '1',
      limit: '50',
    });

    expect(errors).toHaveLength(0);
  });
});
