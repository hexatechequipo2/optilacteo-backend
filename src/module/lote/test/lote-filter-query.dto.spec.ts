import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoteFilterQueryDto } from '../dto/lote-filter-query.dto';
import { EstadoLote } from '../enums/estado-lote.enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

const API_MODEL_PROPERTIES = 'swagger/apiModelProperties';

describe('LoteFilterQueryDto', () => {
  it('debe instanciarse con los valores por defecto correctamente', () => {
    const dto = new LoteFilterQueryDto();

    expect(dto).toBeDefined();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  describe('Validaciones y Transformaciones (class-validator / class-transformer)', () => {
    it('debe ser válido cuando se envía un objeto vacío (todos los campos son opcionales)', async () => {
      const plainData = {};

      const dto = plainToInstance(LoteFilterQueryDto, plainData);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('debe transformar y validar correctamente cuando se proporcionan datos válidos', async () => {
      const plainData = {
        estado: EstadoLote.EN_PROCESO,
        clasificacion: ClasificacionLote.APTO,
        proveedorId: '10', // Viene como string desde query params y @Type lo transforma a number
        fechaDesde: '2026-07-01T00:00:00Z',
        fechaHasta: '2026-07-31T23:59:59Z',
        page: '2',
        limit: '50',
      };

      const dto = plainToInstance(LoteFilterQueryDto, plainData);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.estado).toBe(EstadoLote.EN_PROCESO);
      expect(dto.clasificacion).toBe(ClasificacionLote.APTO);
      expect(dto.proveedorId).toBe(10);
      expect(typeof dto.proveedorId).toBe('number');
      expect(dto.fechaDesde).toBe('2026-07-01T00:00:00Z');
      expect(dto.fechaHasta).toBe('2026-07-31T23:59:59Z');
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
    });

    it('debe retornar errores de validación si los enums o tipos son inválidos', async () => {
      const plainData = {
        estado: 'ESTADO_INVALIDO',
        clasificacion: 'CLASIFICACION_INVALIDA',
        proveedorId: 'no-es-un-numero',
        fechaDesde: 'fecha-invalida',
        fechaHasta: 'otra-fecha-invalida',
        page: 0, // Min(1) fallará
        limit: -5, // Min(1) fallará
      };

      const dto = plainToInstance(LoteFilterQueryDto, plainData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map((err) => err.property);
      expect(errorProperties).toContain('estado');
      expect(errorProperties).toContain('clasificacion');
      expect(errorProperties).toContain('proveedorId');
      expect(errorProperties).toContain('fechaDesde');
      expect(errorProperties).toContain('fechaHasta');
      expect(errorProperties).toContain('page');
      expect(errorProperties).toContain('limit');
    });
  });

  describe('Decoradores de Swagger (@ApiPropertyOptional)', () => {
    it('debe tener configurada la metadata de Swagger para los campos opcionales', () => {
      // Act
      const estadoMeta = Reflect.getMetadata(
        API_MODEL_PROPERTIES,
        LoteFilterQueryDto.prototype,
        'estado',
      );
      const clasificacionMeta = Reflect.getMetadata(
        API_MODEL_PROPERTIES,
        LoteFilterQueryDto.prototype,
        'clasificacion',
      );
      const pageMeta = Reflect.getMetadata(
        API_MODEL_PROPERTIES,
        LoteFilterQueryDto.prototype,
        'page',
      );
      const limitMeta = Reflect.getMetadata(
        API_MODEL_PROPERTIES,
        LoteFilterQueryDto.prototype,
        'limit',
      );

      expect(estadoMeta).toBeDefined();
      expect(estadoMeta.required).toBe(false);
      expect(estadoMeta.enum).toEqual(Object.values(EstadoLote));

      expect(clasificacionMeta).toBeDefined();
      expect(clasificacionMeta.required).toBe(false);
      expect(clasificacionMeta.enum).toEqual(Object.values(ClasificacionLote));

      expect(pageMeta).toBeDefined();
      expect(pageMeta.required).toBe(false);
      expect(pageMeta.default).toBe(1);

      expect(limitMeta).toBeDefined();
      expect(limitMeta.required).toBe(false);
      expect(limitMeta.default).toBe(20);
    });
  });
});
