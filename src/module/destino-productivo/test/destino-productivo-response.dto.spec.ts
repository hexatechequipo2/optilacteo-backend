import { DestinoProductivoResponseDto } from '../dto/destino-productivo-response.dto';

describe('DestinoProductivoResponseDto — Cobertura de DTO (HU-49)', () => {
  it('debe instanciar correctamente la clase DestinoProductivoResponseDto con sus propiedades', () => {
    const dto = new DestinoProductivoResponseDto();
    dto.id = 1;
    dto.nombre = 'Queso Cremoso';

    expect(dto).toBeInstanceOf(DestinoProductivoResponseDto);
    expect(dto.id).toBe(1);
    expect(dto.nombre).toBe('Queso Cremoso');
  });
});