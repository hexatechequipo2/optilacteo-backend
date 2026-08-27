import {
  EventoTrazabilidadDto,
  TrazabilidadLoteResponseDto,
} from '../dto/trazabilidad-lote-response.dto';

import { TipoEventoTrazabilidad } from '../enums/tipo-evento-trazabilidad.enum';

describe('EventoTrazabilidadDto', () => {
  it('debería permitir construir correctamente un evento de trazabilidad', () => {
    const fecha = new Date('2026-08-20T10:00:00');

    const dto = new EventoTrazabilidadDto();

    dto.tipo = Object.values(
      TipoEventoTrazabilidad,
    )[0] as TipoEventoTrazabilidad;

    dto.fecha = fecha;
    dto.descripcion = 'Ingreso de materia prima';
    dto.detalle = {
      codigo: 'LOT-001',
      cantidad: 1000,
      proveedorId: 5,
    };

    expect(dto.tipo).toBeDefined();
    expect(dto.fecha).toBe(fecha);
    expect(dto.descripcion).toBe('Ingreso de materia prima');
    expect(dto.detalle).toEqual({
      codigo: 'LOT-001',
      cantidad: 1000,
      proveedorId: 5,
    });
  });

  it('debería permitir distintos tipos de información dentro de detalle', () => {
    const dto = new EventoTrazabilidadDto();

    dto.tipo = Object.values(
      TipoEventoTrazabilidad,
    )[0] as TipoEventoTrazabilidad;

    dto.fecha = new Date();
    dto.descripcion = 'Evento de prueba';

    dto.detalle = {
      cantidad: 100,
      clasificacion: 'APROBADO',
      parametros: [
        {
          parametro: 'TEMPERATURA',
          valor: 4,
        },
      ],
      usuarioId: 10,
    };

    expect(dto.detalle).toHaveProperty('cantidad', 100);
    expect(dto.detalle).toHaveProperty('clasificacion', 'APROBADO');
    expect(dto.detalle).toHaveProperty('usuarioId', 10);
    expect(dto.detalle.parametros).toEqual([
      {
        parametro: 'TEMPERATURA',
        valor: 4,
      },
    ]);
  });
});

describe('TrazabilidadLoteResponseDto', () => {
  it('debería permitir construir correctamente la respuesta de trazabilidad de un lote', () => {
    const evento = new EventoTrazabilidadDto();

    evento.tipo = Object.values(
      TipoEventoTrazabilidad,
    )[0] as TipoEventoTrazabilidad;

    evento.fecha = new Date('2026-08-20T10:00:00');
    evento.descripcion = 'Ingreso de materia prima';

    evento.detalle = {
      codigo: 'LOT-001',
      cantidad: 1000,
    };

    const dto = new TrazabilidadLoteResponseDto();

    dto.loteId = 1;
    dto.codigoLote = 'LOT-001';
    dto.eventos = [evento];

    expect(dto).toEqual({
      loteId: 1,
      codigoLote: 'LOT-001',
      eventos: [
        {
          tipo: evento.tipo,
          fecha: new Date('2026-08-20T10:00:00'),
          descripcion: 'Ingreso de materia prima',
          detalle: {
            codigo: 'LOT-001',
            cantidad: 1000,
          },
        },
      ],
    });
  });

  it('debería permitir una trazabilidad con múltiples eventos', () => {
    const eventoRecepcion = new EventoTrazabilidadDto();

    eventoRecepcion.tipo = Object.values(
      TipoEventoTrazabilidad,
    )[0] as TipoEventoTrazabilidad;

    eventoRecepcion.fecha = new Date('2026-08-20T08:00:00');
    eventoRecepcion.descripcion = 'Recepción del lote';
    eventoRecepcion.detalle = {
      cantidad: 1000,
    };

    const eventoConsumo = new EventoTrazabilidadDto();

    eventoConsumo.tipo = Object.values(
      TipoEventoTrazabilidad,
    )[1] as TipoEventoTrazabilidad;

    eventoConsumo.fecha = new Date('2026-08-20T12:00:00');
    eventoConsumo.descripcion = 'Consumo parcial';
    eventoConsumo.detalle = {
      cantidad: 300,
    };

    const dto = new TrazabilidadLoteResponseDto();

    dto.loteId = 1;
    dto.codigoLote = 'LOT-001';
    dto.eventos = [eventoRecepcion, eventoConsumo];

    expect(dto.eventos).toHaveLength(2);
    expect(dto.eventos[0].descripcion).toBe('Recepción del lote');
    expect(dto.eventos[1].descripcion).toBe('Consumo parcial');
  });

  it('debería permitir una trazabilidad sin eventos adicionales', () => {
    const dto = new TrazabilidadLoteResponseDto();

    dto.loteId = 1;
    dto.codigoLote = 'LOT-001';
    dto.eventos = [];

    expect(dto.eventos).toEqual([]);
    expect(dto.loteId).toBe(1);
    expect(dto.codigoLote).toBe('LOT-001');
  });
});