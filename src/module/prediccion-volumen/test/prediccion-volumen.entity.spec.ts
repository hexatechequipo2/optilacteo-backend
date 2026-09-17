import 'reflect-metadata';
import { PrediccionVolumen, DiaPrediccion } from '../entities/prediccion-volumen.entity';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { UnidadCantidad } from '../../lote/enums/unidad-cantidad.enum';
import { StatusPrediccion } from '../enums/status-prediccion.enum';
import { Empresa } from '../../empresa/entities/empresa.entity';

describe('PrediccionVolumen Entity', () => {
  it('debe crear una instancia válida de PrediccionVolumen con todos sus campos', () => {
    const mockEmpresa = new Empresa();
    mockEmpresa.id = 1;

    const mockDias: DiaPrediccion[] = [
      {
        fecha: '2026-09-17',
        minimo: 100,
        esperado: 120,
        maximo: 140,
      },
      {
        fecha: '2026-09-18',
        minimo: 110,
        esperado: 130,
        maximo: 150,
      },
    ];

    const mockFechaGeneracion = new Date('2026-09-16T10:00:00Z');
    const mockCreatedAt = new Date('2026-09-16T10:00:00Z');

    const prediccion = new PrediccionVolumen();
    prediccion.id = 10;
    prediccion.empresaId = 1;
    prediccion.empresa = mockEmpresa;
    prediccion.tipoMateriaPrima = TipoMateriaPrima.LECHE_CRUDA;
    prediccion.unidad = UnidadCantidad.LITROS;
    prediccion.fechaGeneracion = mockFechaGeneracion;
    prediccion.modeloVersion = 'v1.0.0';
    prediccion.dias = mockDias;
    prediccion.status = StatusPrediccion.OK;
    prediccion.createdAt = mockCreatedAt;

    expect(prediccion).toBeDefined();
    expect(prediccion.id).toBe(10);
    expect(prediccion.empresaId).toBe(1);
    expect(prediccion.empresa).toBe(mockEmpresa);
    expect(prediccion.tipoMateriaPrima).toBe(TipoMateriaPrima.LECHE_CRUDA);
    expect(prediccion.unidad).toBe(UnidadCantidad.LITROS);
    expect(prediccion.fechaGeneracion).toEqual(mockFechaGeneracion);
    expect(prediccion.modeloVersion).toBe('v1.0.0');
    expect(prediccion.dias).toHaveLength(2);
    expect(prediccion.dias[0]).toEqual({
      fecha: '2026-09-17',
      minimo: 100,
      esperado: 120,
      maximo: 140,
    });
    expect(prediccion.status).toBe(StatusPrediccion.OK);
    expect(prediccion.createdAt).toEqual(mockCreatedAt);
  });

  it('debe permitir la creación de un registro con status INSUFFICIENT_DATA y lista de días vacía', () => {
    const prediccion = new PrediccionVolumen();
    prediccion.empresaId = 2;
    prediccion.tipoMateriaPrima = TipoMateriaPrima.MASA_HILADA;
    prediccion.unidad = UnidadCantidad.KILOGRAMOS;
    prediccion.modeloVersion = 'n/a';
    prediccion.dias = [];
    prediccion.status = StatusPrediccion.INSUFFICIENT_DATA;

    expect(prediccion.status).toBe(StatusPrediccion.INSUFFICIENT_DATA);
    expect(prediccion.dias).toEqual([]);
    expect(prediccion.modeloVersion).toBe('n/a');
  });
});