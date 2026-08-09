import 'reflect-metadata';
import { LoteCreateResponseDto } from '../dto/lote-create-response.dto';
import { LoteResponseDto } from '../dto/lote-response.dto';
import { SensorResponseDto } from '../../sensor/dto/sensor-response.dto';

const SWAGGER_API_MODEL_PROPERTIES = 'swagger/apiModelProperties';

describe('LoteCreateResponseDto', () => {
  it('debe instanciarse correctamente con sus propiedades', () => {
    const mockLote = new LoteResponseDto();
    const mockSensores = [new SensorResponseDto()];

    const dto = new LoteCreateResponseDto();
    dto.lote = mockLote;
    dto.sensoresDisponibles = mockSensores;

    expect(dto).toBeDefined();
    expect(dto.lote).toBe(mockLote);
    expect(dto.sensoresDisponibles).toBe(mockSensores);
  });

  it('debe tener los decoradores @ApiProperty configurados correctamente', () => {
    const loteMeta = Reflect.getMetadata(
      SWAGGER_API_MODEL_PROPERTIES,
      LoteCreateResponseDto.prototype,
      'lote',
    );
    const sensoresMeta = Reflect.getMetadata(
      SWAGGER_API_MODEL_PROPERTIES,
      LoteCreateResponseDto.prototype,
      'sensoresDisponibles',
    );

    expect(loteMeta).toBeDefined();
    expect(loteMeta.type).toBe(LoteResponseDto);

    expect(sensoresMeta).toBeDefined();
    expect(sensoresMeta.type).toBe(SensorResponseDto);
    expect(sensoresMeta.isArray).toBe(true);
  });
});
