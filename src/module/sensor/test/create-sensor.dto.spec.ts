import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { TipoSensor } from '../enums/tipo-sensor.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

describe('CreateSensorDto', () => {
  const tipoSensorValido = Object.values(TipoSensor).find(
    (valor) => typeof valor === 'string',
  ) as TipoSensor;

  const parametroValido = Object.values(Parametro).find(
    (valor) => typeof valor === 'string',
  ) as Parametro;

  const ubicacionValida = Object.values(Ubicacion).find(
    (valor) => typeof valor === 'string',
  ) as Ubicacion;

  const dtoValido = {
    nombre: 'Sensor de temperatura',
    tipo: tipoSensorValido,
    marca: 'Siemens',
    parametro: parametroValido,
    ubicacion: ubicacionValida,
    rangoMinFavor: 10,
    rangoMaxFavor: 100,
  };

  async function validar(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateSensorDto, data);
    return validate(dto);
  }

  describe('nombre', () => {
    it('debería aceptar un nombre válido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'nombre')).toBe(false);
    });

    it('debería rechazar un nombre vacío', async () => {
      const errores = await validar({ ...dtoValido, nombre: '' });

      expect(errores.some((e) => e.property === 'nombre')).toBe(true);
    });

    it('debería rechazar un nombre ausente', async () => {
      const { nombre, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'nombre')).toBe(true);
    });

    it('debería rechazar un nombre que no sea string', async () => {
      const errores = await validar({ ...dtoValido, nombre: 123 });

      expect(errores.some((e) => e.property === 'nombre')).toBe(true);
    });
  });

  describe('tipo', () => {
    it('debería aceptar un tipo de sensor válido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'tipo')).toBe(false);
    });

    it('debería rechazar un tipo de sensor inválido', async () => {
      const errores = await validar({
        ...dtoValido,
        tipo: 'TIPO_INEXISTENTE',
      });

      expect(errores.some((e) => e.property === 'tipo')).toBe(true);
    });

    it('debería rechazar un tipo ausente', async () => {
      const { tipo, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'tipo')).toBe(true);
    });
  });

  describe('marca', () => {
    it('debería aceptar una marca válida', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'marca')).toBe(false);
    });

    it('debería rechazar una marca vacía', async () => {
      const errores = await validar({ ...dtoValido, marca: '' });

      expect(errores.some((e) => e.property === 'marca')).toBe(true);
    });

    it('debería rechazar una marca ausente', async () => {
      const { marca, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'marca')).toBe(true);
    });

    it('debería rechazar una marca que no sea string', async () => {
      const errores = await validar({ ...dtoValido, marca: 123 });

      expect(errores.some((e) => e.property === 'marca')).toBe(true);
    });
  });

  describe('parametro', () => {
    it('debería aceptar un parámetro válido', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'parametro')).toBe(false);
    });

    it('debería rechazar un parámetro inválido', async () => {
      const errores = await validar({
        ...dtoValido,
        parametro: 'PARAMETRO_INEXISTENTE',
      });

      expect(errores.some((e) => e.property === 'parametro')).toBe(true);
    });

    it('debería rechazar un parámetro ausente', async () => {
      const { parametro, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'parametro')).toBe(true);
    });
  });

  describe('ubicacion', () => {
    it('debería aceptar una ubicación válida', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'ubicacion')).toBe(false);
    });

    it('debería rechazar una ubicación inválida', async () => {
      const errores = await validar({
        ...dtoValido,
        ubicacion: 'UBICACION_INEXISTENTE',
      });

      expect(errores.some((e) => e.property === 'ubicacion')).toBe(true);
    });

    it('debería rechazar una ubicación ausente', async () => {
      const { ubicacion, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'ubicacion')).toBe(true);
    });
  });

  describe('rangoMinFavor', () => {
    it('debería aceptar un valor numérico', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'rangoMinFavor')).toBe(false);
    });

    it('debería aceptar un número decimal', async () => {
      const errores = await validar({
        ...dtoValido,
        rangoMinFavor: 10.5,
      });

      expect(errores.some((e) => e.property === 'rangoMinFavor')).toBe(false);
    });

    it('debería rechazar un valor que no sea número', async () => {
      const errores = await validar({
        ...dtoValido,
        rangoMinFavor: '10',
      });

      expect(errores.some((e) => e.property === 'rangoMinFavor')).toBe(true);
    });

    it('debería rechazar un valor ausente', async () => {
      const { rangoMinFavor, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'rangoMinFavor')).toBe(true);
    });
  });

  describe('rangoMaxFavor', () => {
    it('debería aceptar un valor numérico', async () => {
      const errores = await validar(dtoValido);

      expect(errores.some((e) => e.property === 'rangoMaxFavor')).toBe(false);
    });

    it('debería aceptar un número decimal', async () => {
      const errores = await validar({
        ...dtoValido,
        rangoMaxFavor: 100.5,
      });

      expect(errores.some((e) => e.property === 'rangoMaxFavor')).toBe(false);
    });

    it('debería rechazar un valor que no sea número', async () => {
      const errores = await validar({
        ...dtoValido,
        rangoMaxFavor: '100',
      });

      expect(errores.some((e) => e.property === 'rangoMaxFavor')).toBe(true);
    });

    it('debería rechazar un valor ausente', async () => {
      const { rangoMaxFavor, ...data } = dtoValido;
      const errores = await validar(data);

      expect(errores.some((e) => e.property === 'rangoMaxFavor')).toBe(true);
    });
  });

  it('debería aceptar todos los campos con valores válidos', async () => {
    const errores = await validar(dtoValido);

    expect(errores).toHaveLength(0);
  });
});