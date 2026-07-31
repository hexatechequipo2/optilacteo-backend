import 'reflect-metadata';
import { DECORATORS } from '@nestjs/swagger';
import { LoteParametroResponseDto, LoteResponseDto } from '../dto/lote-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { Ubicacion } from '../../sensor/enums/ubicacion.enum';

describe('DTOs de Respuesta de Lote', () => {
  describe('LoteParametroResponseDto', () => {
    it('debe instanciarse correctamente y asignar sus propiedades', () => {
      const dto = new LoteParametroResponseDto();
      dto.parametro = Parametro.TEMPERATURA;
      dto.valor = 4.5;

      expect(dto).toBeDefined();
      expect(dto.parametro).toBe(Parametro.TEMPERATURA);
      expect(dto.valor).toBe(4.5);
    });

    it('debe tener configurada la metadata de Swagger para sus propiedades requeridas y opcionales', () => {
      const materiaPrimaMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'materiaPrima',
      );
      const clasificacionMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'clasificacion',
      );
      const destinoInicialMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'destinoInicial',
      );
      const ubicacionInicialMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'ubicacionInicial',
      );
      const estadoMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'estado',
      );
      const parametrosMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'parametros',
      );

      expect(materiaPrimaMeta).toBeDefined();
      expect(materiaPrimaMeta.enum).toEqual(Object.values(TipoMateriaPrima));

      expect(clasificacionMeta).toBeDefined();
      expect(clasificacionMeta.required).toBe(false);
      expect(clasificacionMeta.enum).toEqual(Object.values(ClasificacionLote));

      expect(destinoInicialMeta).toBeDefined();
      expect(destinoInicialMeta.required).toBe(false);
      expect(destinoInicialMeta.enum).toEqual(Object.values(DestinoLote));

      expect(ubicacionInicialMeta).toBeDefined();
      expect(ubicacionInicialMeta.required).toBe(false);
      expect(ubicacionInicialMeta.enum).toEqual(Object.values(Ubicacion));

      expect(estadoMeta).toBeDefined();
      expect(estadoMeta.enum).toEqual(Object.values(EstadoLote));

      expect(parametrosMeta).toBeDefined();
      expect(parametrosMeta.type).toBe(LoteParametroResponseDto);
      expect(parametrosMeta.isArray).toBe(true);
    });
  });

  describe('LoteResponseDto', () => {
    it('debe instanciarse correctamente con todas sus propiedades (incluyendo opcionales)', () => {
      const paramDto = new LoteParametroResponseDto();
      paramDto.parametro = Parametro.TEMPERATURA;
      paramDto.valor = 12.0;

      const fechaIngreso = new Date('2026-07-31T10:00:00Z');
      const createdAt = new Date('2026-07-31T10:05:00Z');

      const dto = new LoteResponseDto();
      dto.id = 1;
      dto.codigo = 'LOTE-1-00001';
      dto.empresaId = 1;
      dto.proveedorId = 10;
      const materiaPrima = Object.values(TipoMateriaPrima)[0] as TipoMateriaPrima;
      dto.materiaPrima = materiaPrima;
      dto.fechaIngreso = fechaIngreso;
      dto.clasificacion = ClasificacionLote.APTO;
      dto.destinoInicial = 'PROCESAMIENTO' as DestinoLote;
      const ubicacionInicial = Object.values(Ubicacion)[0] as Ubicacion;
      dto.ubicacionInicial = ubicacionInicial;
      dto.estado = EstadoLote.REGISTRADO;
      dto.parametros = [paramDto];
      dto.createdAt = createdAt;

      expect(dto).toBeDefined();
      expect(dto.id).toBe(1);
      expect(dto.codigo).toBe('LOTE-1-00001');
      expect(dto.empresaId).toBe(1);
      expect(dto.proveedorId).toBe(10);
      expect(dto.materiaPrima).toBe(materiaPrima);
      expect(dto.fechaIngreso).toBe(fechaIngreso);
      expect(dto.clasificacion).toBe(ClasificacionLote.APTO);
      expect(dto.destinoInicial).toBe('PROCESAMIENTO' as DestinoLote);
      expect(dto.ubicacionInicial).toBe(ubicacionInicial);
      expect(dto.estado).toBe(EstadoLote.REGISTRADO);
      expect(dto.parametros).toHaveLength(1);
      expect(dto.parametros[0]).toBe(paramDto);
      expect(dto.createdAt).toBe(createdAt);
    });

    it('debe permitir instanciarse con campos opcionales nulos o indefinidos', () => {
      const dto = new LoteResponseDto();
      dto.id = 2;
      dto.codigo = 'LOTE-1-00002';
      dto.empresaId = 1;
      dto.proveedorId = 10;
      dto.materiaPrima = Object.values(TipoMateriaPrima)[0] as TipoMateriaPrima;
      dto.fechaIngreso = new Date();
      dto.clasificacion = null;
      dto.destinoInicial = undefined;
      dto.ubicacionInicial = null;
      dto.estado = EstadoLote.REGISTRADO;
      dto.parametros = [];
      dto.createdAt = new Date();

      expect(dto).toBeDefined();
      expect(dto.clasificacion).toBeNull();
      expect(dto.destinoInicial).toBeUndefined();
      expect(dto.ubicacionInicial).toBeNull();
      expect(dto.parametros).toEqual([]);
    });

    it('debe tener configurada la metadata de Swagger para sus propiedades requeridas y opcionales', () => {
      const materiaPrimaMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'materiaPrima',
      );
      const clasificacionMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'clasificacion',
      );
      const destinoInicialMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'destinoInicial',
      );
      const ubicacionInicialMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'ubicacionInicial',
      );
      const estadoMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'estado',
      );
      const parametrosMeta = Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES,
        LoteResponseDto.prototype,
        'parametros',
      );

      // Assert
      expect(materiaPrimaMeta).toBeDefined();
      expect(materiaPrimaMeta.enum).toEqual(Object.values(TipoMateriaPrima));

      expect(clasificacionMeta).toBeDefined();
      expect(clasificacionMeta.required).toBe(false);
      expect(clasificacionMeta.enum).toEqual(Object.values(ClasificacionLote));

      expect(destinoInicialMeta).toBeDefined();
      expect(destinoInicialMeta.required).toBe(false);
      expect(destinoInicialMeta.enum).toEqual(Object.values(DestinoLote));

      expect(ubicacionInicialMeta).toBeDefined();
      expect(ubicacionInicialMeta.required).toBe(false);
      expect(ubicacionInicialMeta.enum).toEqual(Object.values(Ubicacion));

      expect(estadoMeta).toBeDefined();
      expect(estadoMeta.enum).toEqual(Object.values(EstadoLote));

      expect(parametrosMeta).toBeDefined();
      expect(parametrosMeta.type).toBe(LoteParametroResponseDto);
      expect(parametrosMeta.isArray).toBe(true);
    });
  });
});