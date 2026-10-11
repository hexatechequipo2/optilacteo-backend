import { ApiProperty } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { LecturaResponseDto } from '../dto/lectura-response.dto';
import { OrigenLectura } from '../enums/origen-lectura.enum';
import { EstadoMedicion } from '../enums/estado-medicion.enum';

describe('LecturaResponseDto', () => {
  let dto: LecturaResponseDto;

  beforeEach(() => {
    dto = Object.assign(new LecturaResponseDto(), {
      id: 1,
      sensorId: 2,
      loteId: 3,
      valor: 25.5,
      timestampLectura: new Date('2026-01-15T10:00:00.000Z'),
      empresaId: 4,
      origen: Object.values(OrigenLectura)[0],
      usuarioId: null,
      createdAt: new Date('2026-01-15T10:05:00.000Z'),
      estado: Object.values(EstadoMedicion)[0],
    });
  });

  it('debe estar definido', () => {
    expect(dto).toBeDefined();
    expect(dto).toBeInstanceOf(LecturaResponseDto);
  });

  it('debe asignar correctamente todas las propiedades', () => {
    expect(dto.id).toBe(1);
    expect(dto.sensorId).toBe(2);
    expect(dto.loteId).toBe(3);
    expect(dto.valor).toBe(25.5);
    expect(dto.timestampLectura).toEqual(
      new Date('2026-01-15T10:00:00.000Z'),
    );
    expect(dto.empresaId).toBe(4);
    expect(dto.origen).toBe(Object.values(OrigenLectura)[0]);
    expect(dto.usuarioId).toBeNull();
    expect(dto.createdAt).toEqual(
      new Date('2026-01-15T10:05:00.000Z'),
    );
    expect(dto.estado).toBe(Object.values(EstadoMedicion)[0]);
  });

  it('debe permitir que estado no esté definido', () => {
    const { estado, ...datos } = dto;
    const dtoSinEstado = Object.assign(new LecturaResponseDto(), datos);

    expect(dtoSinEstado.estado).toBeUndefined();
  });

  it('debe permitir usuarioId con un valor numérico', () => {
    dto.usuarioId = 10;

    expect(dto.usuarioId).toBe(10);
  });

  it('debe conservar los tipos Date de las fechas', () => {
    expect(dto.timestampLectura).toBeInstanceOf(Date);
    expect(dto.createdAt).toBeInstanceOf(Date);
  });
});