import { PoliticaRetencionResponseDto } from '../dto/politica-retencion-response.dto';

describe('PoliticaRetencionResponseDto', () => {
  it('debe crear una instancia válida de PoliticaRetencionResponseDto con todas sus propiedades', () => {
    const dto = new PoliticaRetencionResponseDto();
    const fechaCreacion = new Date('2026-01-01T00:00:00.000Z');
    const fechaActualizacion = new Date('2026-05-10T12:00:00.000Z');

    dto.id = 1;
    dto.empresaId = 100;
    dto.retencionMeses = 24;
    dto.diasAvisoVencimiento = 30;
    dto.createdAt = fechaCreacion;
    dto.updatedAt = fechaActualizacion;

    expect(dto).toBeDefined();
    expect(dto.id).toBe(1);
    expect(dto.empresaId).toBe(100);
    expect(dto.retencionMeses).toBe(24);
    expect(dto.diasAvisoVencimiento).toBe(30);
    expect(dto.createdAt).toBe(fechaCreacion);
    expect(dto.updatedAt).toBe(fechaActualizacion);
  });

  it('debe permitir instanciar una respuesta con valores por defecto (ej. id 0 y fechas base)', () => {
    const dto = new PoliticaRetencionResponseDto();
    const fechaBase = new Date(0);

    dto.id = 0;
    dto.empresaId = 105;
    dto.retencionMeses = 24;
    dto.diasAvisoVencimiento = 30;
    dto.createdAt = fechaBase;
    dto.updatedAt = fechaBase;

    expect(dto.id).toBe(0);
    expect(dto.empresaId).toBe(105);
    expect(dto.createdAt.getTime()).toBe(0);
    expect(dto.updatedAt.getTime()).toBe(0);
  });
});