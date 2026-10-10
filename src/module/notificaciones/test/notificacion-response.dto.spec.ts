import { NotificacionResponseDto } from '../dto/notificacion-response.dto';
import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { TipoDesvioAnomalia } from '../enums/tipo-desvio-anomalia.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('NotificacionResponseDto', () => {
  const tipoValido = Object.values(TipoNotificacion).find(
    (value) => typeof value === 'string',
  ) as TipoNotificacion;

  const nivelAlertaValido = Object.values(NivelAlerta).find(
    (value) => typeof value === 'string',
  ) as NivelAlerta;

  const estadoAlertaValido = Object.values(EstadoAlerta).find(
    (value) => typeof value === 'string',
  ) as EstadoAlerta;

  const tipoDesvioValido = Object.values(TipoDesvioAnomalia).find(
    (value) => typeof value === 'string',
  ) as TipoDesvioAnomalia;

  const parametroValido = Object.values(Parametro).find(
    (value) => typeof value === 'string',
  ) as Parametro;

  it('debería crear una notificación con sus campos obligatorios', () => {
    const fecha = new Date('2026-01-01T10:00:00.000Z');

    const dto = new NotificacionResponseDto();
    dto.id = 1;
    dto.tipo = tipoValido;
    dto.mensaje = 'Se detectó una alerta';
    dto.leida = false;
    dto.createdAt = fecha;

    expect(dto).toBeInstanceOf(NotificacionResponseDto);
    expect(dto.id).toBe(1);
    expect(dto.tipo).toBe(tipoValido);
    expect(dto.mensaje).toBe('Se detectó una alerta');
    expect(dto.leida).toBe(false);
    expect(dto.createdAt).toEqual(fecha);
  });

  it('debería crear una notificación con todos los campos opcionales', () => {
    const fecha = new Date('2026-01-01T10:00:00.000Z');

    const dto = Object.assign(new NotificacionResponseDto(), {
      id: 2,
      tipo: tipoValido,
      mensaje: 'Anomalía detectada',
      data: { origen: 'sensor', valor: 8.5 },
      nivelAlerta: nivelAlertaValido,
      loteId: 10,
      loteCodigo: 'LOTE-001',
      parametro: parametroValido,
      sensorId: 20,
      tipoDesvio: tipoDesvioValido,
      confianza: 95,
      modeloVersion: 'v1.0',
      marcadaFalsoPositivoPorId: 30,
      fechaMarcadoFalsoPositivo: fecha,
      estado: estadoAlertaValido,
      accionCorrectiva: 'Revisar el sensor',
      resueltaPorId: 40,
      fechaResolucion: fecha,
      leida: true,
      createdAt: fecha,
    });

    expect(dto.data).toEqual({ origen: 'sensor', valor: 8.5 });
    expect(dto.nivelAlerta).toBe(nivelAlertaValido);
    expect(dto.loteId).toBe(10);
    expect(dto.loteCodigo).toBe('LOTE-001');
    expect(dto.parametro).toBe(parametroValido);
    expect(dto.sensorId).toBe(20);
    expect(dto.tipoDesvio).toBe(tipoDesvioValido);
    expect(dto.confianza).toBe(95);
    expect(dto.modeloVersion).toBe('v1.0');
    expect(dto.marcadaFalsoPositivoPorId).toBe(30);
    expect(dto.fechaMarcadoFalsoPositivo).toEqual(fecha);
    expect(dto.estado).toBe(estadoAlertaValido);
    expect(dto.accionCorrectiva).toBe('Revisar el sensor');
    expect(dto.resueltaPorId).toBe(40);
    expect(dto.fechaResolucion).toEqual(fecha);
  });

  it('debería permitir null en los campos opcionales', () => {
    const fecha = new Date('2026-01-01T10:00:00.000Z');

    const dto = Object.assign(new NotificacionResponseDto(), {
      id: 3,
      tipo: tipoValido,
      mensaje: 'Notificación sin datos adicionales',
      data: null,
      nivelAlerta: null,
      loteId: null,
      loteCodigo: null,
      parametro: null,
      sensorId: null,
      tipoDesvio: null,
      confianza: null,
      modeloVersion: null,
      marcadaFalsoPositivoPorId: null,
      fechaMarcadoFalsoPositivo: null,
      estado: null,
      accionCorrectiva: null,
      resueltaPorId: null,
      fechaResolucion: null,
      leida: false,
      createdAt: fecha,
    });

    expect(dto.data).toBeNull();
    expect(dto.nivelAlerta).toBeNull();
    expect(dto.loteId).toBeNull();
    expect(dto.loteCodigo).toBeNull();
    expect(dto.parametro).toBeNull();
    expect(dto.sensorId).toBeNull();
    expect(dto.tipoDesvio).toBeNull();
    expect(dto.confianza).toBeNull();
    expect(dto.modeloVersion).toBeNull();
    expect(dto.marcadaFalsoPositivoPorId).toBeNull();
    expect(dto.fechaMarcadoFalsoPositivo).toBeNull();
    expect(dto.estado).toBeNull();
    expect(dto.accionCorrectiva).toBeNull();
    expect(dto.resueltaPorId).toBeNull();
    expect(dto.fechaResolucion).toBeNull();
  });

  it('debería permitir que los campos opcionales queden undefined', () => {
    const dto = new NotificacionResponseDto();
    dto.id = 4;
    dto.tipo = tipoValido;
    dto.mensaje = 'Notificación básica';
    dto.leida = false;
    dto.createdAt = new Date('2026-02-01T10:00:00.000Z');

    expect(dto.data).toBeUndefined();
    expect(dto.nivelAlerta).toBeUndefined();
    expect(dto.loteId).toBeUndefined();
    expect(dto.loteCodigo).toBeUndefined();
    expect(dto.parametro).toBeUndefined();
    expect(dto.sensorId).toBeUndefined();
    expect(dto.tipoDesvio).toBeUndefined();
    expect(dto.confianza).toBeUndefined();
    expect(dto.modeloVersion).toBeUndefined();
    expect(dto.estado).toBeUndefined();
    expect(dto.accionCorrectiva).toBeUndefined();
    expect(dto.fechaResolucion).toBeUndefined();
  });

  it('debería conservar la información adicional dentro de data', () => {
    const data = {
      sensor: 'SENSOR-01',
      valorDetectado: 12.5,
      detalles: {
        origen: 'modelo-ml',
      },
    };

    const dto = Object.assign(new NotificacionResponseDto(), {
      id: 5,
      tipo: tipoValido,
      mensaje: 'Alerta con información adicional',
      data,
      leida: false,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
    });

    expect(dto.data).toEqual(data);
    expect(dto.data?.['detalles']).toEqual({ origen: 'modelo-ml' });
  });

  it('debería conservar confianza igual a 0 y a 100', () => {
    const dto = new NotificacionResponseDto();

    dto.confianza = 0;
    expect(dto.confianza).toBe(0);

    dto.confianza = 100;
    expect(dto.confianza).toBe(100);
  });

  it('debería conservar los valores de leida true y false', () => {
    const dto = new NotificacionResponseDto();

    dto.leida = true;
    expect(dto.leida).toBe(true);

    dto.leida = false;
    expect(dto.leida).toBe(false);
  });
});