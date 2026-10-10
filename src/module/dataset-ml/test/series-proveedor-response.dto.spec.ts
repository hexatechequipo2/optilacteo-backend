import { SerieProveedorResponseDto } from '../dto/serie-proveedor-response.dto';

describe('SerieProveedorResponseDto', () => {
  it('permite armar la serie histórica de un proveedor', () => {
    const dto = new SerieProveedorResponseDto();
    dto.proveedorId = 1;
    dto.proveedorNombre = 'Tambo Don Juan';
    dto.cantidadLotes = 12;
    dto.series = [
      {
        parametro: 'ph',
        materiaPrima: 'LECHE',
        valores: [6.6, 6.7, 6.8],
        umbralMin: 6.5,
        umbralMax: null,
      },
    ];

    expect(dto).toBeInstanceOf(SerieProveedorResponseDto);
    expect(dto.series[0].valores).toHaveLength(3);
    expect(dto.series[0].umbralMax).toBeNull();
  });
});