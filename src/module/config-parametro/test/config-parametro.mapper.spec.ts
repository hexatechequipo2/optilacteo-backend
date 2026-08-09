import { ConfigParametroMapper } from '../mappers/config-parametro.mapper';
import { ConfiguracionParametro } from '../entities/config-parametro.entity';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { CreateConfigParametroDto } from '../dto/create-config-parametro.dto';

describe('ConfigParametroMapper', () => {
  afterEach(() => jest.clearAllMocks());

  const tipoMateriaPrima = Object.values(
    TipoMateriaPrima,
  )[0] as TipoMateriaPrima;

  describe('toEntity', () => {
    it('cuando se recibe un DTO válido, debe crear una entidad con todos sus datos', () => {
      const dto: CreateConfigParametroDto = {
        parametro: Parametro.TEMPERATURA,
        tipoMateriaPrima,
        umbralMin: 2,
        umbralMax: 8,
      };

      const empresaId = 10;

      const entity = ConfigParametroMapper.toEntity(dto, empresaId);

      expect(entity).toBeInstanceOf(ConfiguracionParametro);
      expect(entity.empresaId).toBe(empresaId);
      expect(entity.parametro).toBe(dto.parametro);
      expect(entity.tipoMateriaPrima).toBe(dto.tipoMateriaPrima);
      expect(entity.umbralMin).toBe(dto.umbralMin);
      expect(entity.umbralMax).toBe(dto.umbralMax);
    });
  });

  describe('toResponse', () => {
    it('cuando recibe una entidad válida, debe convertirla correctamente al DTO de respuesta', () => {
      const entity = new ConfiguracionParametro();

      entity.id = 1;
      entity.empresaId = 5;
      entity.parametro = Parametro.TEMPERATURA;
      entity.tipoMateriaPrima = tipoMateriaPrima;
      entity.umbralMin = 2;
      entity.umbralMax = 8;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const dto = ConfigParametroMapper.toResponse(entity);

      expect(dto.id).toBe(entity.id);
      expect(dto.empresaId).toBe(entity.empresaId);
      expect(dto.parametro).toBe(entity.parametro);
      expect(dto.tipoMateriaPrima).toBe(entity.tipoMateriaPrima);
      expect(dto.umbralMin).toBe(entity.umbralMin);
      expect(dto.umbralMax).toBe(entity.umbralMax);
      expect(dto.createdAt).toBe(entity.createdAt);
      expect(dto.updatedAt).toBe(entity.updatedAt);
    });

    it('cuando los umbrales son decimales, debe convertirlos al tipo number', () => {
      const entity = new ConfiguracionParametro();

      entity.id = 1;
      entity.empresaId = 3;
      entity.parametro = Parametro.TEMPERATURA;
      entity.tipoMateriaPrima = tipoMateriaPrima;

      entity.umbralMin = '5.50' as unknown as number;
      entity.umbralMax = '12.75' as unknown as number;

      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const dto = ConfigParametroMapper.toResponse(entity);

      expect(typeof dto.umbralMin).toBe('number');
      expect(typeof dto.umbralMax).toBe('number');

      expect(dto.umbralMin).toBe(5.5);
      expect(dto.umbralMax).toBe(12.75);
    });
  });
});
