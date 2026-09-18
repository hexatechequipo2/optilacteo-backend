import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  DiaPrediccionDto,
  DiaHistoricoDto,
  PrediccionVolumenResponseDto,
} from '../dto/prediccion-volumen-response.dto';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { UnidadCantidad } from '../../lote/enums/unidad-cantidad.enum';
import { StatusPrediccion } from '../enums/status-prediccion.enum';

describe('PrediccionVolumenResponseDto', () => {
  describe('DiaPrediccionDto', () => {
    it('debe instanciar y mapear correctamente los campos', () => {
      const plainData = {
        fecha: '2026-09-17',
        minimo: 100,
        esperado: 120,
        maximo: 140,
      };

      const dto = plainToInstance(DiaPrediccionDto, plainData);

      expect(dto.fecha).toBe('2026-09-17');
      expect(dto.minimo).toBe(100);
      expect(dto.esperado).toBe(120);
      expect(dto.maximo).toBe(140);
    });
  });

  describe('DiaHistoricoDto', () => {
    it('debe instanciar y mapear correctamente los campos', () => {
      const plainData = {
        fecha: '2026-09-15',
        valor: 110,
      };

      const dto = plainToInstance(DiaHistoricoDto, plainData);

      expect(dto.fecha).toBe('2026-09-15');
      expect(dto.valor).toBe(110);
    });
  });

  describe('PrediccionVolumenResponseDto', () => {
    it('debe mapear correctamente un objeto plano a una instancia de DTO con status OK', () => {
      const mockFecha = new Date();
      const plainData = {
        status: StatusPrediccion.OK,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        unidad: UnidadCantidad.LITROS,
        fechaActualizacionModelo: mockFecha,
        modeloVersion: 'v1.0.0',
        prediccion: [
          {
            fecha: '2026-09-17',
            minimo: 100,
            esperado: 120,
            maximo: 140,
          },
        ],
        historicoReciente: [
          {
            fecha: '2026-09-15',
            valor: 110,
          },
        ],
        mensaje: null,
      };

      const responseDto = plainToInstance(PrediccionVolumenResponseDto, plainData);

      expect(responseDto.status).toBe(StatusPrediccion.OK);
      expect(responseDto.tipoMateriaPrima).toBe(TipoMateriaPrima.LECHE_CRUDA);
      expect(responseDto.unidad).toBe(UnidadCantidad.LITROS);
      expect(responseDto.fechaActualizacionModelo).toEqual(mockFecha);
      expect(responseDto.modeloVersion).toBe('v1.0.0');
      expect(responseDto.prediccion).toHaveLength(1);
      expect(responseDto.prediccion[0].esperado).toBe(120);
      expect(responseDto.historicoReciente).toHaveLength(1);
      expect(responseDto.historicoReciente[0].valor).toBe(110);
      expect(responseDto.mensaje).toBeNull();
    });

    it('debe soportar la estructura de respuesta con status INSUFFICIENT_DATA', () => {
      const plainData = {
        status: StatusPrediccion.INSUFFICIENT_DATA,
        tipoMateriaPrima: TipoMateriaPrima.MASA_HILADA,
        unidad: UnidadCantidad.KILOGRAMOS,
        fechaActualizacionModelo: null,
        modeloVersion: null,
        prediccion: [],
        historicoReciente: [{ fecha: '2026-09-10', valor: 50 }],
        mensaje: 'Se requieren al menos 21 días de historia para generar la predicción.',
      };

      const responseDto = plainToInstance(PrediccionVolumenResponseDto, plainData);

      expect(responseDto.status).toBe(StatusPrediccion.INSUFFICIENT_DATA);
      expect(responseDto.tipoMateriaPrima).toBe(TipoMateriaPrima.MASA_HILADA);
      expect(responseDto.prediccion).toHaveLength(0);
      expect(responseDto.historicoReciente).toHaveLength(1);
      expect(responseDto.mensaje).toContain('al menos 21 días');
    });
  });
});