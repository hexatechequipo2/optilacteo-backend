import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AsociarLoteDto } from '../dto/asociar-lote.dto';

describe('AsociarLoteDto', () => {
  async function validar(data: Record<string, unknown>) {
    const dto = plainToInstance(AsociarLoteDto, data);
    return validate(dto);
  }

  describe('sensorIds', () => {
    it('debería aceptar un array con sensores únicos', async () => {
      const errores = await validar({
        sensorIds: [1, 2, 3],
      });

      expect(errores).toHaveLength(0);
    });

    it('debería aceptar un array con un solo sensor', async () => {
      const errores = await validar({
        sensorIds: [1],
      });

      expect(errores).toHaveLength(0);
    });

    it('debería rechazar un array vacío', async () => {
      const errores = await validar({
        sensorIds: [],
      });

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });

    it('debería rechazar IDs duplicados', async () => {
      const errores = await validar({
        sensorIds: [1, 2, 1],
      });

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });

    it('debería rechazar todos los IDs repetidos', async () => {
      const errores = await validar({
        sensorIds: [5, 5],
      });

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });

    it('debería rechazar un valor que no sea un array', async () => {
      const errores = await validar({
        sensorIds: 1,
      });

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });

    it('debería rechazar un string en lugar de un array', async () => {
      const errores = await validar({
        sensorIds: '1,2,3',
      });

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });

    it('debería rechazar un objeto en lugar de un array', async () => {
      const errores = await validar({
        sensorIds: { id: 1 },
      });

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });

    it('debería rechazar un campo ausente', async () => {
      const errores = await validar({});

      expect(errores.some((e) => e.property === 'sensorIds')).toBe(true);
    });
  });
});