import { ConfigParametroMapper } from '../mappers/config-parametro.mapper';
import { ConfiguracionParametro } from '../entities/config-parametro.entity';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
import { CreateConfigParametroDto } from '../dto/create-config-parametro.dto';

describe('ConfigParametroMapper', () => {
  afterEach(() => jest.clearAllMocks());

  const tipoMateriaPrima = Object.values(TipoMateriaPrima)[0];

  describe('toEntity', () => {
    it('cuando se recibe un DTO válido, debe crear una entidad con todos sus datos', () => {
      const dto: CreateConfigParametroDto = {
        parametro: Parametro.TEMPERATURA,
        tipoMateriaPrima,
        umbralAlertaMin: 1,
        umbralMin: 2,
        umbralMax: 8,
        umbralAlertaMax: 9,
      };

      const empresaId = 10;

      const entity = ConfigParametroMapper.toEntity(dto, empresaId);

      expect(entity).toBeInstanceOf(ConfiguracionParametro);
      expect(entity.empresaId).toBe(empresaId);
      expect(entity.parametro).toBe(dto.parametro);
      expect(entity.tipoMateriaPrima).toBe(dto.tipoMateriaPrima);
      expect(entity.umbralAlertaMin).toBe(dto.umbralAlertaMin);
      expect(entity.umbralMin).toBe(dto.umbralMin);
      expect(entity.umbralMax).toBe(dto.umbralMax);
      expect(entity.umbralAlertaMax).toBe(dto.umbralAlertaMax);
    });
  });

  describe('toResponse', () => {
    it('cuando recibe una entidad válida, debe convertirla correctamente al DTO de respuesta', () => {
      const entity = new ConfiguracionParametro();

      entity.id = 1;
      entity.empresaId = 5;
      entity.parametro = Parametro.TEMPERATURA;
      entity.tipoMateriaPrima = tipoMateriaPrima;
      entity.umbralAlertaMin = 1;
      entity.umbralMin = 2;
      entity.umbralMax = 8;
      entity.umbralAlertaMax = 9;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const dto = ConfigParametroMapper.toResponse(entity);

      expect(dto.id).toBe(entity.id);
      expect(dto.empresaId).toBe(entity.empresaId);
      expect(dto.parametro).toBe(entity.parametro);
      expect(dto.tipoMateriaPrima).toBe(entity.tipoMateriaPrima);
      expect(dto.umbralAlertaMin).toBe(entity.umbralAlertaMin);
      expect(dto.umbralMin).toBe(entity.umbralMin);
      expect(dto.umbralMax).toBe(entity.umbralMax);
      expect(dto.umbralAlertaMax).toBe(entity.umbralAlertaMax);
      expect(dto.createdAt).toBe(entity.createdAt);
      expect(dto.updatedAt).toBe(entity.updatedAt);
    });

    it('cuando los umbrales son decimales, debe convertirlos al tipo number', () => {
      const entity = new ConfiguracionParametro();

      entity.id = 1;
      entity.empresaId = 3;
      entity.parametro = Parametro.TEMPERATURA;
      entity.tipoMateriaPrima = tipoMateriaPrima;

      entity.umbralAlertaMin = '4.25' as unknown as number;
      entity.umbralMin = '5.50' as unknown as number;
      entity.umbralMax = '12.75' as unknown as number;
      entity.umbralAlertaMax = '14.00' as unknown as number;

      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const dto = ConfigParametroMapper.toResponse(entity);

      expect(typeof dto.umbralAlertaMin).toBe('number');
      expect(typeof dto.umbralMin).toBe('number');
      expect(typeof dto.umbralMax).toBe('number');
      expect(typeof dto.umbralAlertaMax).toBe('number');

      expect(dto.umbralAlertaMin).toBe(4.25);
      expect(dto.umbralMin).toBe(5.5);
      expect(dto.umbralMax).toBe(12.75);
      expect(dto.umbralAlertaMax).toBe(14);
    });
  });
});
