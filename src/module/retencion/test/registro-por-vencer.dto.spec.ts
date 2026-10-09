import {
  RegistroPorVencerDto,
  ProximosAVencerResponseDto,
} from '../dto/registro-por-vencer.dto';

describe('RegistroPorVencer DTOs', () => {
  describe('RegistroPorVencerDto', () => {
    it('debe instanciar correctamente un registro por vencer con sus datos de entidad y fechas', () => {
      const dto = new RegistroPorVencerDto();
      const fechaCreacion = new Date('2024-05-10T00:00:00.000Z');
      const fechaVencimiento = new Date('2026-05-10T00:00:00.000Z');

      dto.entidad = 'lotes';
      dto.id = 42;
      dto.createdAt = fechaCreacion;
      dto.fechaVencimiento = fechaVencimiento;
      dto.diasRestantes = 15;

      expect(dto).toBeDefined();
      expect(dto.entidad).toBe('lotes');
      expect(dto.id).toBe(42);
      expect(dto.createdAt).toEqual(fechaCreacion);
      expect(dto.fechaVencimiento).toEqual(fechaVencimiento);
      expect(dto.diasRestantes).toBe(15);
    });
  });

  describe('ProximosAVencerResponseDto', () => {
    it('debe instanciar la respuesta agrupada con la lista de registros por vencer', () => {
      const responseDto = new ProximosAVencerResponseDto();
      const registroMock: RegistroPorVencerDto = {
        entidad: 'audit_log',
        id: 10,
        createdAt: new Date('2024-01-01'),
        fechaVencimiento: new Date('2026-01-01'),
        diasRestantes: 5,
      };

      responseDto.retencionMeses = 24;
      responseDto.diasAvisoVencimiento = 30;
      responseDto.total = 1;
      responseDto.registros = [registroMock];

      expect(responseDto).toBeDefined();
      expect(responseDto.retencionMeses).toBe(24);
      expect(responseDto.diasAvisoVencimiento).toBe(30);
      expect(responseDto.total).toBe(1);
      expect(responseDto.registros).toHaveLength(1);
      expect(responseDto.registros[0]).toEqual(registroMock);
    });

    it('debe soportar una respuesta con una lista vacía de registros', () => {
      const responseDto = new ProximosAVencerResponseDto();

      responseDto.retencionMeses = 24;
      responseDto.diasAvisoVencimiento = 30;
      responseDto.total = 0;
      responseDto.registros = [];

      expect(responseDto.total).toBe(0);
      expect(responseDto.registros).toEqual([]);
    });
  });
});