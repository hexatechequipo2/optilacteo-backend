import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

const transformar = (plain: Record<string, unknown>) =>
  plainToInstance(PaginationQueryDto, plain);

describe('PaginationQueryDto', () => {
  describe('valores por defecto', () => {
    it('usa page=1 y limit=20 si no se envía nada', async () => {
      const dto = transformar({});

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('transformación desde query string', () => {
    it('convierte page y limit de string a number', () => {
      const dto = transformar({ page: '3', limit: '50' });

      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(50);
    });

    it('acepta los valores límite (page=1, limit=1 y limit=100)', async () => {
      for (const plain of [
        { page: '1', limit: '1' },
        { page: '1', limit: '100' },
      ]) {
        expect(await validate(transformar(plain))).toHaveLength(0);
      }
    });
  });

  describe('validaciones', () => {
    it.each([
      ['page menor a 1', { page: '0' }, 'page'],
      ['page negativo', { page: '-5' }, 'page'],
      ['page decimal', { page: '1.5' }, 'page'],
      ['page no numérico', { page: 'abc' }, 'page'],
      ['limit menor a 1', { limit: '0' }, 'limit'],
      ['limit mayor a 100', { limit: '101' }, 'limit'],
      ['limit decimal', { limit: '2.5' }, 'limit'],
      ['limit no numérico', { limit: 'abc' }, 'limit'],
    ])('rechaza %s', async (_label, plain, campo) => {
      const errores = await validate(transformar(plain));

      expect(errores.map((e) => e.property)).toContain(campo);
    });

    it('reporta ambos campos si los dos son inválidos', async () => {
      const errores = await validate(transformar({ page: '0', limit: '500' }));

      expect(errores.map((e) => e.property).sort()).toEqual(['limit', 'page']);
    });
  });
});