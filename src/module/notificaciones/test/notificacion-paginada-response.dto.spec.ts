import { NotificacionPaginadaResponseDto } from '../dto/notificacion-paginada-response.dto';
import { NotificacionResponseDto } from '../dto/notificacion-response.dto';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('NotificacionPaginadaResponseDto', () => {
  it('debe instanciarse correctamente y asignar todas sus propiedades', () => {
    const mockData: NotificacionResponseDto[] = [
      {
        id: 1,
        tipo: 'ALERTA' as any,
        mensaje: 'Temperatura fuera de rango',
        leida: false,
        createdAt: new Date(),
        data: { loteId: 10 },
      },
      {
        id: 2,
        tipo: 'INFO' as any,
        mensaje: 'Lote completado',
        leida: true,
        createdAt: new Date(),
        data: null,
      },
    ];

    const dto = new NotificacionPaginadaResponseDto();
    dto.data = mockData;
    dto.total = 2;
    dto.page = 1;
    dto.limit = 10;

    expect(dto).toBeDefined();
    expect(dto.data).toHaveLength(2);
    expect(dto.data).toEqual(mockData);
    expect(dto.total).toBe(2);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('debe conservar los decoradores de ApiProperty para Swagger', () => {
    const properties = Reflect.getMetadata(
      'swagger/apiModelPropertiesArray',
      NotificacionPaginadaResponseDto.prototype,
    );

    // Formato de llaves registrado por NestJS Swagger: ':propiedad'
    expect(properties).toContain(':data');
    expect(properties).toContain(':total');
    expect(properties).toContain(':page');
    expect(properties).toContain(':limit');
  });
});
