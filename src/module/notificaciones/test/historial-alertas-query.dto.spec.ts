import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HistorialAlertasQueryDto } from '../dto/historial-alertas-query.dto';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

describe('HistorialAlertasQueryDto', () => {
  it('debe pasar la validación con valores por defecto cuando no se proveen parámetros', async () => {
    const dto = plainToInstance(HistorialAlertasQueryDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('debe pasar la validación cuando todos los campos son válidos', async () => {
    const plainData = {
      estado: EstadoAlerta.ABIERTA,
      loteId: '5',
      nivelAlerta: NivelAlerta.ADVERTENCIA,
      fechaInicio: '2026-08-01',
      fechaFin: '2026-08-12',
      page: '2',
      limit: '10',
    };

    const dto = plainToInstance(HistorialAlertasQueryDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.loteId).toBe(5);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('debe fallar la validación si estado o nivelAlerta no corresponden al Enum', async () => {
    const plainData = {
      estado: 'ESTADO_INVALIDO',
      nivelAlerta: 'NIVEL_INVALIDO',
    };

    const dto = plainToInstance(HistorialAlertasQueryDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(2);
    expect(errors.map((e) => e.property)).toContain('estado');
    expect(errors.map((e) => e.property)).toContain('nivelAlerta');
  });

  it('debe fallar la validación si loteId, page o limit son menores a 1 o no son enteros', async () => {
    const plainData = {
      loteId: 0,
      page: -1,
      limit: 'no-numero',
    };

    const dto = plainToInstance(HistorialAlertasQueryDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(3);
  });

  it('debe fallar la validación si las fechas no están en formato ISO8601', async () => {
    const plainData = {
      fechaInicio: '01/08/2026',
      fechaFin: 'fecha-invalida',
    };

    const dto = plainToInstance(HistorialAlertasQueryDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(2);
    expect(errors.map((e) => e.property)).toContain('fechaInicio');
    expect(errors.map((e) => e.property)).toContain('fechaFin');
  });
});
