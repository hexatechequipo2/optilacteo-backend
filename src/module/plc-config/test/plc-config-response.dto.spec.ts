import { plainToInstance } from 'class-transformer';
import {
  PlcConfigResponseDto,
  TestConnectionResponseDto,
} from '../dto/plc-config-response.dto';

describe('PLC Config Response DTOs', () => {
  describe('PlcConfigResponseDto', () => {
    it('debe instanciar correctamente la clase cuando contiene datos', () => {
      const plainData = {
        url: 'http://192.168.1.50:8080/api/lecturas',
        requierePlc: true,
      };

      const dto = plainToInstance(PlcConfigResponseDto, plainData);

      expect(dto).toBeInstanceOf(PlcConfigResponseDto);
      expect(dto.url).toBe('http://192.168.1.50:8080/api/lecturas');
      expect(dto.requierePlc).toBe(true);
    });

    it('debe permitir que la propiedad url sea null', () => {
      const plainData = {
        url: null,
        requierePlc: false,
      };

      const dto = plainToInstance(PlcConfigResponseDto, plainData);

      expect(dto).toBeInstanceOf(PlcConfigResponseDto);
      expect(dto.url).toBeNull();
      expect(dto.requierePlc).toBe(false);
    });
  });

  describe('TestConnectionResponseDto', () => {
    it('debe instanciar correctamente la clase cuando la conexión es exitosa', () => {
      const plainData = {
        ok: true,
        mensaje: 'Conexión exitosa. El PLC respondió correctamente.',
      };

      const dto = plainToInstance(TestConnectionResponseDto, plainData);

      expect(dto).toBeInstanceOf(TestConnectionResponseDto);
      expect(dto.ok).toBe(true);
      expect(dto.mensaje).toBe(
        'Conexión exitosa. El PLC respondió correctamente.',
      );
    });

    it('debe instanciar correctamente la clase cuando la conexión falla', () => {
      const plainData = {
        ok: false,
        mensaje: 'No se pudo establecer conexión con el PLC.',
      };

      const dto = plainToInstance(TestConnectionResponseDto, plainData);

      expect(dto).toBeInstanceOf(TestConnectionResponseDto);
      expect(dto.ok).toBe(false);
      expect(dto.mensaje).toBe('No se pudo establecer conexión con el PLC.');
    });
  });
});
