import { PlcConfigMapper } from '../mappers/plc-config.mapper';
import { PlcConfig } from '../entities/plc-config.entity';

describe('PlcConfigMapper', () => {
  describe('toResponseDto', () => {
    it('debería mapear la URL cuando existe una configuración PLC', () => {
      const config = {
        url: 'http://localhost:8080',
      } as PlcConfig;

      const resultado = PlcConfigMapper.toResponseDto(config, true);

      expect(resultado).toEqual({
        url: 'http://localhost:8080',
        requierePlc: true,
      });
    });

    it('debería devolver url null cuando la configuración es null', () => {
      const resultado = PlcConfigMapper.toResponseDto(null, true);

      expect(resultado).toEqual({
        url: null,
        requierePlc: true,
      });
    });

    it('debería conservar requierePlc en false', () => {
      const config = {
        url: 'http://plc.local',
      } as PlcConfig;

      const resultado = PlcConfigMapper.toResponseDto(config, false);

      expect(resultado).toEqual({
        url: 'http://plc.local',
        requierePlc: false,
      });
    });

    it('debería devolver url null si la URL de la configuración es null', () => {
      const config = {
        url: null,
      } as unknown as PlcConfig;

      const resultado = PlcConfigMapper.toResponseDto(config, false);

      expect(resultado).toEqual({
        url: null,
        requierePlc: false,
      });
    });

    it('debería devolver url null si la URL es undefined', () => {
      const config = {} as PlcConfig;

      const resultado = PlcConfigMapper.toResponseDto(config, true);

      expect(resultado).toEqual({
        url: null,
        requierePlc: true,
      });
    });

    it('debería devolver exactamente las propiedades esperadas', () => {
      const config = {
        url: 'https://plc.empresa.com',
      } as PlcConfig;

      const resultado = PlcConfigMapper.toResponseDto(config, true);

      expect(Object.keys(resultado).sort()).toEqual([
        'requierePlc',
        'url',
      ]);
    });
  });
});